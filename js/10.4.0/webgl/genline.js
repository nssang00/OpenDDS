for (const entry of geometryRenderEntries) {
  const stride = entry.feature.stride_;
  ++refCounter;
  let offset = 0;

  // 명확한 변수명
  const customAttrValues = [];
  const customAttrSize = pushCustomAttributesInRenderInstructionsFromFeatures(
    customAttrValues,
    customAttributes,
    entry,
    0,
    refCounter
  );

  for (const end of entry.ends) {
    for (let i = 0; i < customAttrSize; ++i)
      renderInstructions[renderIndex++] = customAttrValues[i];

    renderInstructions[renderIndex++] = (end - offset) / stride;

    for (let i = offset; i < end; i += stride) {
      renderInstructions[renderIndex++] = entry.pixelCoordinates[i];
      renderInstructions[renderIndex++] = entry.pixelCoordinates[i + 1];
      renderInstructions[renderIndex++] = stride === 3 ? entry.pixelCoordinates[i + 2] : 0;
    }
    offset = end;
  }
}



ol.renderer/webgl/VectorTileLayer.js
this.workerEnabled_ = !options.disableWorker;//kmg

this.styleRenderer_ = new VectorStyleRenderer(
  this.workerEnabled_,//kmg
  );

ol/layer/WebGLVectorTile.js
this.workerDisabled_ = options.disableWorker ?? false;//kmg
createRenderer() {
  cacheSize: this.getCacheSize(),
  disableWorker: this.workerDisabled_,//kmg

main.js
  style:styles,
  disableWorker: true,

const label = `generateBuffers(${features.length})-${Date.now()}`;
  console.time(label);

  console.log('buffers', buffers.lineStringBuffers[2].array_.length);
  console.timeEnd(label);
  this.setReady();
    ////////


function generateLineStringBuffers_(renderInstructions, customAttributesSize, transform) {
  const customAttrsCount = customAttributesSize;
  const instructionsPerVertex = 3;

  let currentInstructionsIndex = 0;
  let totalSegments = 0;
  while (currentInstructionsIndex < renderInstructions.length) {
    currentInstructionsIndex += customAttrsCount;
    const verticesCount = renderInstructions[currentInstructionsIndex++];
    totalSegments += (verticesCount - 1);
    currentInstructionsIndex += verticesCount * instructionsPerVertex;
  }  

  const floatsPerSegment =
    2 +                // p0(x, y)
    1 +                // m0
    2 +                // p1(x, y)
    1 +                // m1
    2 +                // angle0, angle1
    1 +                // currentLength
    1 +                // currentAngleTangentSum
    customAttrsCount;  // customAttrs
  const totalFloats = totalSegments * floatsPerSegment;
  const instanceAttributes = new Float32Array(totalFloats);
  let instanceOffset = 0;

  const invertTransform = createTransform();
  makeInverseTransform(invertTransform, transform);

  currentInstructionsIndex = 0;
  while (currentInstructionsIndex < renderInstructions.length) {
    const customAttributes = [];
    for (let i = 0; i < customAttrsCount; ++i)
      customAttributes[i] = renderInstructions[currentInstructionsIndex + i];
    currentInstructionsIndex += customAttrsCount;
    const verticesCount = renderInstructions[currentInstructionsIndex++];

    const firstInstructionsIndex = currentInstructionsIndex;
    const lastInstructionsIndex = currentInstructionsIndex + (verticesCount - 1) * instructionsPerVertex;
    const isLoop =
      renderInstructions[firstInstructionsIndex] === renderInstructions[lastInstructionsIndex] &&
      renderInstructions[firstInstructionsIndex + 1] === renderInstructions[lastInstructionsIndex + 1];

    let currentLength = 0;
    let currentAngleTangentSum = 0;

    const worldCoordCache = [];

    function getWorldCoord(index, offset) {
      if (offset === null || offset < 0 || offset >= verticesCount) return null;

      if (worldCoordCache[index]?.offset === offset) 
        return worldCoordCache[index].world;

      const segmentStartIndex = currentInstructionsIndex + offset * instructionsPerVertex;
      const world = applyTransform(invertTransform, [
        renderInstructions[segmentStartIndex],
        renderInstructions[segmentStartIndex + 1]
      ]);
      worldCoordCache[index] = { offset, world };
      return world;
    }

    for (let i = 0; i < verticesCount - 1; ++i) {
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

      const segmentStartIndex = currentInstructionsIndex + i * instructionsPerVertex;
      const segmentEndIndex   = currentInstructionsIndex + (i + 1) * instructionsPerVertex;
      const p0 = [renderInstructions[segmentStartIndex], renderInstructions[segmentStartIndex + 1]];
      const p1 = [renderInstructions[segmentEndIndex],   renderInstructions[segmentEndIndex + 1]];
      const m0 = renderInstructions[segmentStartIndex + 2];
      const m1 = renderInstructions[segmentEndIndex + 2];

      const idx0 = (segmentStartIndex - currentInstructionsIndex) / instructionsPerVertex;
      const idx1 = (segmentEndIndex   - currentInstructionsIndex) / instructionsPerVertex;
      let idxB = null, idxA = null;
      if (beforeIndex !== null)
        idxB = (beforeIndex - currentInstructionsIndex) / instructionsPerVertex;
      if (afterIndex !== null)
        idxA = (afterIndex - currentInstructionsIndex) / instructionsPerVertex;

      const pBworld = getWorldCoord(0, idxB);
      const p0world = getWorldCoord(1, idx0);
      const p1world = getWorldCoord(2, idx1);
      const pAworld = getWorldCoord(3, idxA);
      worldCoordCache.shift();

      function angleBetween(p0, pA, pB) {
        const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
        const bx = pB[0] - p0[0], by = pB[1] - p0[1];
        if ((ax * ax + ay * ay) < 1e-12 || (bx * bx + by * by) < 1e-12) return 0;
        const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
        return angle < 0 ? angle + 2 * Math.PI : angle;
      }

      let angle0 = -1, angle1 = -1;
      let newAngleTangentSum = currentAngleTangentSum;
      if (beforeIndex !== null) {
        angle0 = angleBetween(p0world, p1world, pBworld);
        if (Math.cos(angle0) <= 0.985)//LINESTRING_ANGLE_COSINE_CUTOFF
          newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
      }
      if (afterIndex !== null) {
        angle1 = angleBetween(p1world, p0world, pAworld);
        if (Math.cos(angle1) <= 0.985)//LINESTRING_ANGLE_COSINE_CUTOFF
          newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
      }

      instanceAttributes[instanceOffset++] = p0[0];
      instanceAttributes[instanceOffset++] = p0[1];
      instanceAttributes[instanceOffset++] = m0;
      instanceAttributes[instanceOffset++] = p1[0];
      instanceAttributes[instanceOffset++] = p1[1];
      instanceAttributes[instanceOffset++] = m1;
      instanceAttributes[instanceOffset++] = angle0;
      instanceAttributes[instanceOffset++] = angle1;
      instanceAttributes[instanceOffset++] = currentLength;
      instanceAttributes[instanceOffset++] = currentAngleTangentSum;
      for (let j = 0; j < customAttrsCount; ++j)
        instanceAttributes[instanceOffset++] = customAttributes[j];

      currentLength += Math.sqrt(
        (p1world[0] - p0world[0]) * (p1world[0] - p0world[0]) +
        (p1world[1] - p0world[1]) * (p1world[1] - p0world[1])
      );
      currentAngleTangentSum = newAngleTangentSum;
    }
    currentInstructionsIndex += verticesCount * instructionsPerVertex;
  }

  return {
    indicesBuffer: new Uint32Array([0, 1, 3, 1, 2, 3]),
    vertexAttributesBuffer: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
    instanceAttributesBuffer: instanceAttributes,
  };
}
