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
  
  // 재사용 가능한 배열들 - slice 제거를 위한 최적화
  const customAttributes = new Array(customAttrsCount);
  const holes = [];
  
  while (instructionsIndex < instructions.length) {
    // slice 대신 직접 복사
    for (let i = 0; i < customAttrsCount; ++i) {
      customAttributes[i] = instructions[instructionsIndex + i];
    }
    instructionsIndex += customAttrsCount;

    const ringsCount = instructions[instructionsIndex++];
    holes.length = ringsCount - 1; // 배열 재사용
    let verticesCount = 0;
    for (let i = 0; i < ringsCount; ++i) {
      verticesCount += instructions[instructionsIndex++];
      if (i < ringsCount - 1) 
        holes[i] = verticesCount;
    }

    const flatCoordsStart = instructionsIndex;
    const flatCoordsLength = verticesCount * instructionsPerVertex;

    // earcut에 TypedArray view 전달 (slice 제거)
    const flatCoordsView = instructions.subarray 
      ? instructions.subarray(flatCoordsStart, flatCoordsStart + flatCoordsLength)
      : instructions.slice(flatCoordsStart, flatCoordsStart + flatCoordsLength);
    
    const result = earcut(flatCoordsView, holes, instructionsPerVertex);

    // 좌표 복사 최적화 - 직접 인덱스 접근
    for (let i = 0; i < verticesCount; ++i) {
      const base = (vertexOffset + i) * (2 + customAttrsCount);
      const coordIndex = flatCoordsStart + i * 2;
      vertices[base] = instructions[coordIndex];
      vertices[base + 1] = instructions[coordIndex + 1];
      for (let j = 0; j < customAttrsCount; ++j) {
        vertices[base + 2 + j] = customAttributes[j];
      }
    }

    for (let i = 0; i < result.length; ++i) {
      indices[indexOffset + i] = result[i] + vertexOffset;
    }
    vertexOffset += verticesCount;
    indexOffset += result.length;

    instructionsIndex += flatCoordsLength;
  }

  return {
    indicesBuffer: (indexOffset < indices.length) ? indices.subarray(0, indexOffset) : indices,
    vertexAttributesBuffer: vertices,
    instanceAttributesBuffer: new Float32Array([]),
  };
}
