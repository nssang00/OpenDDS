function generatePolygonBuffers_(instructions, customAttributesSize) {
  const customAttrsCount = customAttributesSize;  
  const instructionsPerVertex = 2; // x, y

  let currentInstructionsIndex = 0;
  let totalVertexCount = 0;
  let maxTotalIndices = 0;
  const polygonInfos = [];

  while (currentInstructionsIndex < instructions.length) {
    const customAttrsStartIndex = currentInstructionsIndex;
    currentInstructionsIndex += customAttrsCount;
    
    const ringsCount = instructions[currentInstructionsIndex++];
    const holes = new Array(ringsCount - 1);
    let verticesCount = 0;
    
    for (let i = 0; i < ringsCount; ++i) {
      const ringVertexCount = instructions[currentInstructionsIndex++];
      verticesCount += ringVertexCount;
      if (i < ringsCount - 1) {
        holes[i] = verticesCount;
      }
    }
    
    const flatCoordsStartIndex = currentInstructionsIndex;
    currentInstructionsIndex += verticesCount * 2;
    
    polygonInfos.push({
      customAttrsStartIndex,
      flatCoordsStartIndex,
      verticesCount,
      holes: holes.length > 0 ? holes.slice() : null
    });
    
    totalVertexCount += verticesCount;
    maxTotalIndices += verticesCount * 3;
  }

  const vertices = new Float32Array(totalVertexCount * (2 + customAttrsCount));
  const indices = new Uint32Array(maxTotalIndices);

  let vertexOffset = 0;
  let indexOffset = 0;

  for (let polygonIndex = 0; polygonIndex < polygonInfos.length; polygonIndex++) {
    const info = polygonInfos[polygonIndex];
    
    const verticesCount = info.verticesCount;
    const flatCoordsStart = info.flatCoordsStartIndex;
    const customAttrsStart = info.customAttrsStartIndex;
    
    const flatCoords = new Float32Array(verticesCount * 2);
    for (let i = 0; i < verticesCount * 2; i++) {
      flatCoords[i] = instructions[flatCoordsStart + i];
    }
    
    const result = earcut(flatCoords, info.holes, instructionsPerVertex);

    const vertexStride = 2 + customAttrsCount;
    for (let i = 0; i < verticesCount; ++i) {
      const base = (vertexOffset + i) * vertexStride;
      const coordBase = i * 2;
      
      vertices[base] = flatCoords[coordBase];
      vertices[base + 1] = flatCoords[coordBase + 1];
      
      for (let j = 0; j < customAttrsCount; ++j) {
        vertices[base + 2 + j] = instructions[customAttrsStart + j];
      }
    }

    for (let i = 0; i < result.length; ++i) {
      indices[indexOffset + i] = result[i] + vertexOffset;
    }
    
    vertexOffset += verticesCount;
    indexOffset += result.length;
  }

  return {
    indicesBuffer: indexOffset < indices.length ? indices.subarray(0, indexOffset) : indices,
    vertexAttributesBuffer: vertices,
    instanceAttributesBuffer: new Float32Array([]),
  };
}
