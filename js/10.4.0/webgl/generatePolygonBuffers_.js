function generatePolygonBuffers_(instructions, customAttributesSize) {
  const customAttrsCount = customAttributesSize;
  const instructionsPerVertex = 2; // x, y
  let currentInstructionsIndex = 0;
  let totalVertexCount = 0;

  // 1. 전체 vertex 수만 미리 계산
  while (currentInstructionsIndex < instructions.length) {
    currentInstructionsIndex += customAttrsCount;
    const ringsCount = instructions[currentInstructionsIndex++];
    let flatCoordsCount = 0;
    for (let i = 0; i < ringsCount; ++i) {
      flatCoordsCount += instructions[currentInstructionsIndex++];
    }
    currentInstructionsIndex += flatCoordsCount * 2;
    totalVertexCount += flatCoordsCount;
  }

  // 2. vertex는 미리, indices는 동적 배열로!
  const vertices = new Float32Array(totalVertexCount * (2 + customAttrsCount));
  const indices = [];

  let instructionsIndex = 0;
  let vertexOffset = 0;

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
      verticesCount += instructions[instructionsIndex++];
      if (i < ringsCount - 1) holes[i] = verticesCount;
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
      indices.push(result[i] + vertexOffset);
    }

    vertexOffset += verticesCount;
    instructionsIndex += verticesCount * instructionsPerVertex;
  }

  return {
    indicesBuffer: new Uint32Array(indices),
    vertexAttributesBuffer: vertices,
    instanceAttributesBuffer: new Float32Array([]),
  };
}
