async generateBuffers(geometryBatch, transform) {
  if (geometryBatch.isEmpty()) {
    return null;
  }
  const renderInstructions = this.generateRenderInstructions_(
    geometryBatch,
    transform,
  );
  const [polygonBuffers, lineStringBuffers, pointBuffers] = await Promise.all(
    [
      this.generateBuffersForType_(
        renderInstructions.polygonInstructions,
        'Polygon',
        transform,
      ),
      this.generateBuffersForType_(
        renderInstructions.lineStringInstructions,
        'LineString',
        transform,
      ),
      this.generateBuffersForType_(
        renderInstructions.pointInstructions,
        'Point',
        transform,
      ),
    ],
  );
  // also return the inverse of the transform that was applied when generating buffers
  const invertVerticesTransform = makeInverseTransform(
    createTransform(),
    transform,
  );
  return {
    polygonBuffers: polygonBuffers,
    lineStringBuffers: lineStringBuffers,
    pointBuffers: pointBuffers,
    invertVerticesTransform: invertVerticesTransform,
  };
}

generateBuffersForType_(renderInstructions, geometryType, transform) {
    if (renderInstructions === null) {
      return null;
    }

    const messageId = workerMessageCounter++;
    let messageType;
    switch (geometryType) {
      case 'Polygon':
        messageType = WebGLWorkerMessageType.GENERATE_POLYGON_BUFFERS;
        break;
      case 'LineString':
        messageType = WebGLWorkerMessageType.GENERATE_LINE_STRING_BUFFERS;
        break;
      case 'Point':
        messageType = WebGLWorkerMessageType.GENERATE_POINT_BUFFERS;
        break;
      default:
      // pass
    }

    /** @type {import('./constants.js').WebGLWorkerGenerateBuffersMessage} */
    const message = {
      id: messageId,
      type: messageType,
      renderInstructions: renderInstructions.buffer,
      renderInstructionsTransform: transform,
      customAttributesSize: getCustomAttributesSize(this.customAttributes_),
    };
    const WEBGL_WORKER = getWebGLWorker();
    WEBGL_WORKER.postMessage(message, [renderInstructions.buffer]);

    // leave ownership of render instructions
    renderInstructions = null;

    return new Promise((resolve) => {
      /**
       * @param {{data: import('./constants.js').WebGLWorkerGenerateBuffersMessage}} event Event.
       */
      const handleMessage = (event) => {
        const received = event.data;

        // this is not the response to our request: skip
        if (received.id !== messageId) {
          return;
        }

        // we've received our response: stop listening
        WEBGL_WORKER.removeEventListener('message', handleMessage);

        // the helper has disposed in the meantime; the promise will not be resolved
        if (!this.helper_.getGL()) {
          return;
        }

        // copy & flush received buffers to GPU
        const indicesBuffer = new WebGLArrayBuffer(
          ELEMENT_ARRAY_BUFFER,
          DYNAMIC_DRAW,
        ).fromArrayBuffer(received.indicesBuffer);
        const vertexAttributesBuffer = new WebGLArrayBuffer(
          ARRAY_BUFFER,
          DYNAMIC_DRAW,
        ).fromArrayBuffer(received.vertexAttributesBuffer);
        const instanceAttributesBuffer = new WebGLArrayBuffer(
          ARRAY_BUFFER,
          DYNAMIC_DRAW,
        ).fromArrayBuffer(received.instanceAttributesBuffer);
        this.helper_.flushBufferData(indicesBuffer);
        this.helper_.flushBufferData(vertexAttributesBuffer);
        this.helper_.flushBufferData(instanceAttributesBuffer);

        resolve([
          indicesBuffer,
          vertexAttributesBuffer,
          instanceAttributesBuffer,
        ]);
      };

      WEBGL_WORKER.addEventListener('message', handleMessage);
    });
  }


  
worker.onmessage = (event) => {
  const received = event.data;
  switch (received.type) {
    case WebGLWorkerMessageType.GENERATE_POINT_BUFFERS: {
      const baseIndicesAttrsCount = 2; // x, y
      const baseInstructionsCount = 2;

      const customAttrsCount = received.customAttributesSize;
      const instructionsCount = baseInstructionsCount + customAttrsCount;
      const renderInstructions = new Float32Array(received.renderInstructions);

      const elementsCount = renderInstructions.length / instructionsCount;
      const instanceAttributesCount =
        elementsCount * (baseIndicesAttrsCount + customAttrsCount);
      const indicesBuffer = Uint32Array.from([0, 1, 3, 1, 2, 3]);
      const vertexAttributesBuffer = Float32Array.from([
        -1, -1, 1, -1, 1, 1, -1, 1,
      ]); // local position
      const instanceAttributesBuffer = new Float32Array(
        instanceAttributesCount,
      );

      let bufferPositions;
      for (let i = 0; i < renderInstructions.length; i += instructionsCount) {
        bufferPositions = writePointFeatureToBuffers(
          renderInstructions,
          i,
          instanceAttributesBuffer,
          customAttrsCount,
          bufferPositions,
        );
      }

      /** @type {import('../render/webgl/constants.js').WebGLWorkerGenerateBuffersMessage} */
      const message = Object.assign(
        {
          indicesBuffer: indicesBuffer.buffer,
          vertexAttributesBuffer: vertexAttributesBuffer.buffer,
          instanceAttributesBuffer: instanceAttributesBuffer.buffer,
          renderInstructions: renderInstructions.buffer,
        },
        received,
      );

      worker.postMessage(message, [
        vertexAttributesBuffer.buffer,
        instanceAttributesBuffer.buffer,
        indicesBuffer.buffer,
        renderInstructions.buffer,
      ]);
      break;
    }
    case WebGLWorkerMessageType.GENERATE_LINE_STRING_BUFFERS: {
      /** @type {Array<number>} */
      const instanceAttributes = [];

      const customAttrsCount = received.customAttributesSize;
      const instructionsPerVertex = 3;

      const renderInstructions = new Float32Array(received.renderInstructions);
      let currentInstructionsIndex = 0;

      const transform = received.renderInstructionsTransform;
      const invertTransform = createTransform();
      makeInverseTransform(invertTransform, transform);

      let verticesCount, customAttributes;
      while (currentInstructionsIndex < renderInstructions.length) {
        customAttributes = Array.from(
          renderInstructions.slice(
            currentInstructionsIndex,
            currentInstructionsIndex + customAttrsCount,
          ),
        );
        currentInstructionsIndex += customAttrsCount;
        verticesCount = renderInstructions[currentInstructionsIndex++];

        const firstInstructionsIndex = currentInstructionsIndex;
        const lastInstructionsIndex =
          currentInstructionsIndex +
          (verticesCount - 1) * instructionsPerVertex;
        const isLoop =
          renderInstructions[firstInstructionsIndex] ===
            renderInstructions[lastInstructionsIndex] &&
          renderInstructions[firstInstructionsIndex + 1] ===
            renderInstructions[lastInstructionsIndex + 1];

        let currentLength = 0;
        let currentAngleTangentSum = 0;

        // last point is only a segment end, do not loop over it
        for (let i = 0; i < verticesCount - 1; i++) {
          let beforeIndex = null;
          if (i > 0) {
            beforeIndex =
              currentInstructionsIndex + (i - 1) * instructionsPerVertex;
          } else if (isLoop) {
            beforeIndex = lastInstructionsIndex - instructionsPerVertex;
          }
          let afterIndex = null;
          if (i < verticesCount - 2) {
            afterIndex =
              currentInstructionsIndex + (i + 2) * instructionsPerVertex;
          } else if (isLoop) {
            afterIndex = firstInstructionsIndex + instructionsPerVertex;
          }
          const measures = writeLineSegmentToBuffers(
            renderInstructions,
            currentInstructionsIndex + i * instructionsPerVertex,
            currentInstructionsIndex + (i + 1) * instructionsPerVertex,
            beforeIndex,
            afterIndex,
            instanceAttributes,
            customAttributes,
            invertTransform,
            currentLength,
            currentAngleTangentSum,
          );
          currentLength = measures.length;
          currentAngleTangentSum = measures.angle;
        }
        currentInstructionsIndex += verticesCount * instructionsPerVertex;
      }

      const indicesBuffer = Uint32Array.from([0, 1, 3, 1, 2, 3]);
      const vertexAttributesBuffer = Float32Array.from([
        -1, -1, 1, -1, 1, 1, -1, 1,
      ]); // local position
      const instanceAttributesBuffer = Float32Array.from(instanceAttributes);

      /** @type {import('../render/webgl/constants.js').WebGLWorkerGenerateBuffersMessage} */
      const message = Object.assign(
        {
          indicesBuffer: indicesBuffer.buffer,
          vertexAttributesBuffer: vertexAttributesBuffer.buffer,
          instanceAttributesBuffer: instanceAttributesBuffer.buffer,
          renderInstructions: renderInstructions.buffer,
        },
        received,
      );

      worker.postMessage(message, [
        vertexAttributesBuffer.buffer,
        instanceAttributesBuffer.buffer,
        indicesBuffer.buffer,
        renderInstructions.buffer,
      ]);
      break;
    }
    case WebGLWorkerMessageType.GENERATE_POLYGON_BUFFERS: {
      /** @type {Array<number>} */
      const vertices = [];
      /** @type {Array<number>} */
      const indices = [];

      const customAttrsCount = received.customAttributesSize;
      const renderInstructions = new Float32Array(received.renderInstructions);

      let currentInstructionsIndex = 0;
      while (currentInstructionsIndex < renderInstructions.length) {
        currentInstructionsIndex = writePolygonTrianglesToBuffers(
          renderInstructions,
          currentInstructionsIndex,
          vertices,
          indices,
          customAttrsCount,
        );
      }

      const indicesBuffer = Uint32Array.from(indices);
      const vertexAttributesBuffer = Float32Array.from(vertices);
      const instanceAttributesBuffer = Float32Array.from([]); // TODO

      /** @type {import('../render/webgl/constants.js').WebGLWorkerGenerateBuffersMessage} */
      const message = Object.assign(
        {
          indicesBuffer: indicesBuffer.buffer,
          vertexAttributesBuffer: vertexAttributesBuffer.buffer,
          instanceAttributesBuffer: instanceAttributesBuffer.buffer,
          renderInstructions: renderInstructions.buffer,
        },
        received,
      );

      worker.postMessage(message, [
        vertexAttributesBuffer.buffer,
        instanceAttributesBuffer.buffer,
        indicesBuffer.buffer,
        renderInstructions.buffer,
      ]);
      break;
    }
    default:
    // pass
  }
};

export function writePointFeatureToBuffers(
  instructions,
  elementIndex,
  instanceAttributesBuffer,
  customAttributesSize,
  bufferPositions,
) {
  const x = instructions[elementIndex++];
  const y = instructions[elementIndex++];

  // read custom numerical attributes on the feature
  const customAttrs = tmpArray_;
  customAttrs.length = customAttributesSize;
  for (let i = 0; i < customAttrs.length; i++) {
    customAttrs[i] = instructions[elementIndex + i];
  }

  let instPos = bufferPositions
    ? bufferPositions.instanceAttributesPosition
    : 0;

  instanceAttributesBuffer[instPos++] = x;
  instanceAttributesBuffer[instPos++] = y;
  if (customAttrs.length) {
    instanceAttributesBuffer.set(customAttrs, instPos);
    instPos += customAttrs.length;
  }

  bufferPositions_.instanceAttributesPosition = instPos;
  return bufferPositions_;
}

export function writeLineSegmentToBuffers(
  instructions,
  segmentStartIndex,
  segmentEndIndex,
  beforeSegmentIndex,
  afterSegmentIndex,
  instanceAttributesArray,
  customAttributes,
  toWorldTransform,
  currentLength,
  currentAngleTangentSum,
) {
  // The segment is composed of two positions called P0[x0, y0] and P1[x1, y1]
  // Depending on whether there are points before and after the segment, its final shape
  // will be different
  const p0 = [
    instructions[segmentStartIndex + 0],
    instructions[segmentStartIndex + 1],
  ];
  const p1 = [instructions[segmentEndIndex], instructions[segmentEndIndex + 1]];

  const m0 = instructions[segmentStartIndex + 2];
  const m1 = instructions[segmentEndIndex + 2];

  // to compute join angles we need to reproject coordinates back in world units
  const p0world = applyTransform(toWorldTransform, [...p0]);
  const p1world = applyTransform(toWorldTransform, [...p1]);


  function angleBetween(p0, pA, pB) {
    const lenA = Math.sqrt(
      (pA[0] - p0[0]) * (pA[0] - p0[0]) + (pA[1] - p0[1]) * (pA[1] - p0[1]),
    );
    const tangentA = [(pA[0] - p0[0]) / lenA, (pA[1] - p0[1]) / lenA];
    const orthoA = [-tangentA[1], tangentA[0]];
    const lenB = Math.sqrt(
      (pB[0] - p0[0]) * (pB[0] - p0[0]) + (pB[1] - p0[1]) * (pB[1] - p0[1]),
    );
    const tangentB = [(pB[0] - p0[0]) / lenB, (pB[1] - p0[1]) / lenB];

    // this angle can be clockwise or anticlockwise; hence the computation afterwards
    const angle =
      lenA === 0 || lenB === 0
        ? 0
        : Math.acos(
            clamp(tangentB[0] * tangentA[0] + tangentB[1] * tangentA[1], -1, 1),
          );
    const isClockwise = tangentB[0] * orthoA[0] + tangentB[1] * orthoA[1] > 0;
    return !isClockwise ? Math.PI * 2 - angle : angle;
  }

  // a negative angle indicates a line cap
  let angle0 = -1;
  let angle1 = -1;
  let newAngleTangentSum = currentAngleTangentSum;

  const joinBefore = beforeSegmentIndex !== null;
  const joinAfter = afterSegmentIndex !== null;

  // add vertices and adapt offsets for P0 in case of join
  if (joinBefore) {
    // B for before
    const pB = [
      instructions[beforeSegmentIndex],
      instructions[beforeSegmentIndex + 1],
    ];
    const pBworld = applyTransform(toWorldTransform, [...pB]);
    angle0 = angleBetween(p0world, p1world, pBworld);

    // only add to the sum if the angle isn't too close to 0 or 2PI
    if (Math.cos(angle0) <= LINESTRING_ANGLE_COSINE_CUTOFF) {
      newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
    }
  }
  // adapt offsets for P1 in case of join; add to angle sum
  if (joinAfter) {
    // A for after
    const pA = [
      instructions[afterSegmentIndex],
      instructions[afterSegmentIndex + 1],
    ];
    const pAworld = applyTransform(toWorldTransform, [...pA]);
    angle1 = angleBetween(p1world, p0world, pAworld);

    // only add to the sum if the angle isn't too close to 0 or 2PI
    if (Math.cos(angle1) <= LINESTRING_ANGLE_COSINE_CUTOFF) {
      newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
    }
  }

  instanceAttributesArray.push(
    p0[0],
    p0[1],
    m0,
    p1[0],
    p1[1],
    m1,
    angle0,
    angle1,
    currentLength,
    currentAngleTangentSum,
  );
  instanceAttributesArray.push(...customAttributes);

  return {
    length:
      currentLength +
      Math.sqrt(
        (p1world[0] - p0world[0]) * (p1world[0] - p0world[0]) +
          (p1world[1] - p0world[1]) * (p1world[1] - p0world[1]),
      ),
    angle: newAngleTangentSum,
  };
}

/**
 * Pushes several triangles to form a polygon, including holes
 * @param {Float32Array} instructions Array of render instructions for lines.
 * @param {number} polygonStartIndex Index of the polygon start point from which render instructions will be read.
 * @param {Array<number>} vertexArray Array containing vertices.
 * @param {Array<number>} indexArray Array containing indices.
 * @param {number} customAttributesSize Amount of custom attributes for each element.
 * @return {number} Next polygon instructions index
 * @private
 */
export function writePolygonTrianglesToBuffers(
  instructions,
  polygonStartIndex,
  vertexArray,
  indexArray,
  customAttributesSize,
) {
  const instructionsPerVertex = 2; // x, y
  const attributesPerVertex = 2 + customAttributesSize;
  let instructionsIndex = polygonStartIndex;
  const customAttributes = instructions.slice(
    instructionsIndex,
    instructionsIndex + customAttributesSize,
  );
  instructionsIndex += customAttributesSize;
  const ringsCount = instructions[instructionsIndex++];
  let verticesCount = 0;
  const holes = new Array(ringsCount - 1);
  for (let i = 0; i < ringsCount; i++) {
    verticesCount += instructions[instructionsIndex++];
    if (i < ringsCount - 1) {
      holes[i] = verticesCount;
    }
  }
  const flatCoords = instructions.slice(
    instructionsIndex,
    instructionsIndex + verticesCount * instructionsPerVertex,
  );

  // pushing to vertices and indices!! this is where the magic happens
  const result = earcut(flatCoords, holes, instructionsPerVertex);
  for (let i = 0; i < result.length; i++) {
    indexArray.push(result[i] + vertexArray.length / attributesPerVertex);
  }
  for (let i = 0; i < flatCoords.length; i += 2) {
    vertexArray.push(flatCoords[i], flatCoords[i + 1], ...customAttributes);
  }

  return instructionsIndex + verticesCount * instructionsPerVertex;
}


기존 코드는 renderInstructions worker를 이용해서 처리하고 있어.
난 generateBuffersForType_에서 worker를 이용하지 않고 cpu에서 바로 처리하는 코드로 만드려고해
