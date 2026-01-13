
class VectorStyleRenderer {

  //kmg
  async generateBuffersFromFeatures(features, transform) {
    
    const filteredFeatures = [];

    const featureIdSet = new Set();
    for (const styleShader of this.styleShaders) {
      const filtered = styleShader.featureFilter
        ? features.filter(styleShader.featureFilter)
        : features;

      for (const feature of filtered) {
        const featureId = feature.getId() || feature.ol_uid;
        if (!featureIdSet.has(featureId)) {
          featureIdSet.add(featureId);
          filteredFeatures.push(feature);
        }
      }
    }

    const featuresBatch = {
      polygonFeatures: [],
      lineStringFeatures: [],
      pointFeatures: []
    };

    for(const feature of filteredFeatures) {
      const geometryType = feature.getGeometry().getType();
      if(geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
        featuresBatch.polygonFeatures.push(feature);
        if(this.hasStroke_)
          featuresBatch.lineStringFeatures.push(feature);
      } else if(geometryType === 'LineString' || geometryType === 'MultiLineString') {
        featuresBatch.lineStringFeatures.push(feature);
      } else if(geometryType === 'Point' || geometryType === 'MultiPoint') {
        featuresBatch.pointFeatures.push(feature);
      } else {

      }   
    }
    if (featuresBatch.polygonFeatures.length === 0 && 
      featuresBatch.lineStringFeatures.length === 0 && 
      featuresBatch.pointFeatures.length === 0) {
      return null;
    }

    const renderInstructions = this.generateRenderInstructionsFromFeatures_(featuresBatch, transform);

    const label = `generateBuffersForType2_-${Date.now()}`;
    console.time(label);

    const polygonBuffers = this.generateWebGLBuffersFromInstructions_(
          renderInstructions.polygonInstructions,
          'Polygon', transform);

    const lineStringBuffers = this.generateWebGLBuffersFromInstructions_(
          renderInstructions.lineStringInstructions,
          'LineString', transform);

    const pointBuffers = this.generateWebGLBuffersFromInstructions_(
          renderInstructions.pointInstructions,
          'Point', transform);


    const invertVerticesTransform = makeInverseTransform(createTransform(), transform);
    console.timeEnd(label);
    
    return {
      polygonBuffers: polygonBuffers,
      lineStringBuffers: lineStringBuffers,
      pointBuffers: pointBuffers,
      invertVerticesTransform: invertVerticesTransform,
    };
  }

  generateWebGLBuffersFromInstructions_(renderInstructions, geometryType, transform) {
    if (!renderInstructions) return null;

    const customAttributesSize = getCustomAttributesSize(this.customAttributes_);
    let buffers;
    switch (geometryType) {
      case 'Point':
        buffers = generatePointBuffers_(renderInstructions, customAttributesSize);
        break;
      case 'LineString':
        buffers = generateLineStringBuffers_(renderInstructions, customAttributesSize, transform);
        break;
      case 'Polygon':
        buffers = generatePolygonBuffers_(renderInstructions, customAttributesSize);
        break;
      default:
        break;
    }

    const indicesBuffer = new WebGLArrayBuffer(ELEMENT_ARRAY_BUFFER, DYNAMIC_DRAW);
    indicesBuffer.setArray(buffers.indicesBuffer);
    const vertexAttributesBuffer = new WebGLArrayBuffer(ARRAY_BUFFER, DYNAMIC_DRAW);
    vertexAttributesBuffer.setArray(buffers.vertexAttributesBuffer);
    const instanceAttributesBuffer = new WebGLArrayBuffer(ARRAY_BUFFER, DYNAMIC_DRAW)
    instanceAttributesBuffer.setArray(buffers.instanceAttributesBuffer);

    this.helper_.flushBufferData(indicesBuffer);
    this.helper_.flushBufferData(vertexAttributesBuffer);
    this.helper_.flushBufferData(instanceAttributesBuffer);

    return [
      indicesBuffer,
      vertexAttributesBuffer,
      instanceAttributesBuffer,
    ];
  }

  generateRenderInstructionsFromFeatures_(featuresBatch, transform) {
    const polygonInstructions = this.hasFill_
      ? generatePolygonRenderInstructionsFromFeatures(
          featuresBatch.polygonFeatures,
          new Float32Array(0),
          this.customAttributes_,
          transform,
        )
      : null;
    const lineStringInstructions = this.hasStroke_
      ? generateLineStringRenderInstructionsFromFeatures(
          featuresBatch.lineStringFeatures,
          new Float32Array(0),
          this.customAttributes_,
          transform,
        )
      : null;
    const pointInstructions = this.hasSymbol_
      ? generatePointRenderInstructionsFromFeatures(
          featuresBatch.pointFeatures,
          new Float32Array(0),
          this.customAttributes_,
          transform,
        )
      : null;

    return {
      polygonInstructions,
      lineStringInstructions,
      pointInstructions,
    };
  }      

}

export default VectorStyleRenderer;

function pushCustomAttributesInRenderInstructionsFromFeatures(
  renderInstructions,
  customAttributes,
  entry,
  currentIndex,
  refCounter
) {
  let shift = 0;

  for (const key in customAttributes) {
    const attr = customAttributes[key];
    const value = attr.callback.call({ ref: refCounter }, entry.feature);
    const size = attr.size ?? 1;

    let first = value?.[0] ?? value;
    if (first === UNDEFINED_PROP_VALUE) {
      console.warn('The "has" operator might return false positives.'); 
    }
    if (first === undefined) {
      first = UNDEFINED_PROP_VALUE;
    } else if (first === null) {
      first = 0;
    }
    renderInstructions[currentIndex + shift++] = first;
    for (let i = 1; i < size; i++) {
      renderInstructions[currentIndex + shift++] = value[i];
    }
  }
  
  return shift;  
}


function generatePointRenderInstructionsFromFeatures(
  features,
  renderInstructions,
  customAttributes,
  transform,
) {
  let geometriesCount = 0;
  const geometryRenderEntries = new Array(features.length);

  for (let i = 0; i < features.length; i++) {
    const feature = features[i];    
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
  
    geometriesCount++;
  
    const pixelCoordinates = new Array(flatCoordinates.length);
    pixelCoordinates[0] = transform[0] * flatCoordinates[0] + transform[2] * flatCoordinates[1] + transform[4];
    pixelCoordinates[1] = transform[1] * flatCoordinates[0] + transform[3] * flatCoordinates[1] + transform[5];

    geometryRenderEntries[i] = { feature, pixelCoordinates }
  }

  // here we anticipate the amount of render instructions for points:
  // 2 instructions per vertex for position (x and y)
  // + 1 instruction per vertex per custom attributes
  const totalInstructionsCount =
    (2 + getCustomAttributesSize(customAttributes)) * geometriesCount;
  if (
    !renderInstructions ||
    renderInstructions.length !== totalInstructionsCount
  ) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }    
  
  let renderIndex = 0;
  let refCounter = 0;
  for (const entry of geometryRenderEntries) {
    ++refCounter;

    renderInstructions[renderIndex++] = entry.pixelCoordinates[0];
    renderInstructions[renderIndex++] = entry.pixelCoordinates[1];

    renderIndex += pushCustomAttributesInRenderInstructionsFromFeatures(
      renderInstructions,
      customAttributes,
      entry,
      renderIndex,
      refCounter
    );   
  }
  return renderInstructions;
}

function generateLineStringRenderInstructionsFromFeatures(
  features,
  renderInstructions,
  customAttributes,
  transform,
) {
  let verticesCount = 0;
  let geometriesCount = 0;
  const geometryRenderEntries = new Array(features.length);
  
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];    
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();
    const stride = geometry.getStride();
  
    verticesCount += flatCoordinates.length / stride;
    geometriesCount += ends.length;
  
    const pixelCoordinates = new Array(flatCoordinates.length);
    transform2D(
      flatCoordinates, 
      0, 
      flatCoordinates.length, 
      stride, 
      transform, 
      pixelCoordinates, 
      stride
    );
    geometryRenderEntries[i] = { feature, pixelCoordinates, ends };
  }

  // here we anticipate the amount of render instructions for lines:
  // 3 instructions per vertex for position (x, y and m)
  // + 1 instruction per line per custom attributes
  // + 1 instruction per line (for vertices count)
  const totalInstructionsCount =
  3 * verticesCount +
  (1 + getCustomAttributesSize(customAttributes)) * geometriesCount;
  
  if (
    !renderInstructions ||
    renderInstructions.length !== totalInstructionsCount
  ) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }
  
  let renderIndex = 0;
  let refCounter = 0;
  
  for (const entry of geometryRenderEntries) {
    const stride = entry.feature.stride_;    
  
    ++refCounter;
    let offset = 0;

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

      // vertices count
      renderInstructions[renderIndex++] = (end - offset) / stride;
  
      // looping on points for positions
      for (let i = offset; i < end; i += stride) {
        renderInstructions[renderIndex++] = entry.pixelCoordinates[i]; 
        renderInstructions[renderIndex++] = entry.pixelCoordinates[i + 1];
        renderInstructions[renderIndex++] = stride === 3 ? entry.pixelCoordinates[i + 2] : 0;
      }
      offset = end;
    }
  }  
  return renderInstructions;
}

function generatePolygonRenderInstructionsFromFeatures(
  features,
  renderInstructions,
  customAttributes,
  transform,
) {
  let verticesCount = 0;
  let geometriesCount = 0;
  let ringsCount = 0;

  const geometryRenderEntries = new Array(features.length);

  for (let i = 0; i < features.length; i++) {
    const feature = features[i];    
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();
    const stride = geometry.getStride();

    verticesCount += flatCoordinates.length / stride;
    ringsCount += ends.length;

    const multiPolygonEnds = inflateEnds(flatCoordinates, ends);
    geometriesCount += multiPolygonEnds.length;

    const pixelCoordinates = new Array(flatCoordinates.length);
    transform2D(
      flatCoordinates, 
      0, 
      flatCoordinates.length, 
      stride, 
      transform, 
      pixelCoordinates, 
      stride
    );
    geometryRenderEntries[i] = { feature, pixelCoordinates, multiPolygonEnds };
  }

  // here we anticipate the amount of render instructions for polygons:
  // 2 instructions per vertex for position (x and y)
  // + 1 instruction per polygon per custom attributes
  // + 1 instruction per polygon (for vertices count in polygon)
  // + 1 instruction per ring (for vertices count in ring)
  const totalInstructionsCount =
    2 * verticesCount +
    (1 + getCustomAttributesSize(customAttributes)) * geometriesCount +
    ringsCount;

  if (
    !renderInstructions ||
    renderInstructions.length !== totalInstructionsCount
  ) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }

  let renderIndex = 0;
  let refCounter = 0;

  for (const entry of geometryRenderEntries) {
    const stride = entry.feature.stride_;    

    ++refCounter;
    let offset = 0;

    for (const polygonEnds of entry.multiPolygonEnds) {

      renderIndex += pushCustomAttributesInRenderInstructionsFromFeatures(
        renderInstructions,
        customAttributes,
        entry,
        renderIndex,
        refCounter
      );

      // ring count
      const ringsVerticesCount = polygonEnds.length;
      renderInstructions[renderIndex++] = ringsVerticesCount;

      // vertices count in each ring
      for (let i = 0; i < ringsVerticesCount; i++) {
        renderInstructions[renderIndex++] =
          (polygonEnds[i] - (i === 0 ? offset : polygonEnds[i - 1])) / stride;
      }

      // looping on points for positions
      for (let i = 0; i < ringsVerticesCount; i++) {
        let end = polygonEnds[i];

        for (let j = offset; j < end; j += 2) {
          renderInstructions[renderIndex++] = entry.pixelCoordinates[j];
          renderInstructions[renderIndex++] = entry.pixelCoordinates[j + 1];
        }
        offset = end;
      }
    }
  }
  return renderInstructions;
}


// Point buffer generation
function generatePointBuffers_(instructions, customAttributesSize) {
  const customAttrsCount = customAttributesSize;
  const instructionsPerElement = 2 + customAttrsCount;
  const elementCount = instructions.length / instructionsPerElement;
  
  const instanceAttributes = new Float32Array(
    elementCount * (2 + customAttrsCount)
  );

  let bufferPosition = 0;
  for (let i = 0; i < instructions.length; i += instructionsPerElement) {
    instanceAttributes[bufferPosition++] = instructions[i];     // x
    instanceAttributes[bufferPosition++] = instructions[i + 1]; // y
    
    for (let j = 0; j < customAttrsCount; j++) {
      instanceAttributes[bufferPosition++] = instructions[i + 2 + j];
    }
  }

  return {
    indicesBuffer : new Uint32Array([0, 1, 3, 1, 2, 3]),
    vertexAttributesBuffer : new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
    instanceAttributesBuffer : instanceAttributes,
  };

}

function generatePolygonBuffers_(instructions, customAttributesSize) {
  const customAttrsCount = customAttributesSize;  
  const instructionsPerVertex = 2; // x, y

  let currentInstructionsIndex = 0;
  let totalVertexCount = 0;
  let maxTotalIndices = 0;
  while (currentInstructionsIndex < instructions.length) {
    currentInstructionsIndex += customAttrsCount;
    const ringsCount = instructions[currentInstructionsIndex++];
    let flatCoordsCount = 0;
    for (let i = 0; i < ringsCount; ++i) {
      flatCoordsCount += instructions[currentInstructionsIndex++];
    }
    currentInstructionsIndex += flatCoordsCount * 2;
    totalVertexCount += flatCoordsCount;
    maxTotalIndices += flatCoordsCount * 3;
  }

  const vertices = new Float32Array(totalVertexCount * (2 + customAttrsCount));
  const indices = new Uint32Array(maxTotalIndices);

  let instructionsIndex = 0;
  let vertexOffset = 0;
  let indexOffset = 0;
  while (instructionsIndex < instructions.length) {
    const customAttributes = instructions.slice(
      instructionsIndex,
      instructionsIndex + customAttrsCount,
    );
    instructionsIndex += customAttrsCount;

    const ringsCount = instructions[instructionsIndex++];
    const holes = new Array(ringsCount - 1);
    let verticesCount = 0;
    for (let i = 0; i < ringsCount; ++i) {
      //const ringVertexCount = instructions[instructionsIndex++];
      verticesCount += instructions[instructionsIndex++];
      if (i < ringsCount - 1) 
        holes[i] = verticesCount;
    }

    const flatCoords = instructions.slice(
      instructionsIndex,
      instructionsIndex + verticesCount * instructionsPerVertex,
    );

    const result = earcut(flatCoords, holes, instructionsPerVertex);

    for (let i = 0; i < verticesCount; ++i) {
      const base = (vertexOffset + i) * (2 + customAttrsCount);
      vertices[base] = flatCoords[i * 2];
      vertices[base + 1] = flatCoords[i * 2 + 1];
      for (let j = 0; j < customAttrsCount; ++j) {
        vertices[base + 2 + j] = customAttributes[j];
      }
    }

    for (let i = 0; i < result.length; ++i) {
      indices[indexOffset + i] = result[i] + vertexOffset;
    }
    vertexOffset += verticesCount;
    indexOffset += result.length;

    instructionsIndex += verticesCount * instructionsPerVertex;
  }

  return {
    indicesBuffer: (indexOffset < indices.length) ? indices.slice(0, indexOffset) : indices,
    vertexAttributesBuffer: vertices,
    instanceAttributesBuffer: new Float32Array([]),
  };
}

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
