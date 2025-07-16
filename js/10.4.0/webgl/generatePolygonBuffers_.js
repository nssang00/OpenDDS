
function generatePolygonBuffers_(instructions, customAttributesSize = 0) {
  const instructionsPerVertex = 2; // x, y

  let instructionsIndex = 0;
  let totalVertexCount = 0;
  let maxTotalIndices = 0;
  while (instructionsIndex < instructions.length) {
    instructionsIndex += customAttributesSize;
    const ringsCount = instructions[instructionsIndex++];
    let flatCoordsCount = 0;
    for (let i = 0; i < ringsCount; ++i) {
      flatCoordsCount += instructions[instructionsIndex++];
    }
    instructionsIndex += flatCoordsCount * 2;
    totalVertexCount += flatCoordsCount;
    maxTotalIndices += flatCoordsCount * 3;
  }

  const vertexAttributesBuffer = new Float32Array(totalVertexCount * (2 + customAttributesSize));
  const indicesBuffer = new Uint32Array(maxTotalIndices);

  let featureInstructionsIndex = 0;
  let vertexOffset = 0;
  let indexOffset = 0;
  while (featureInstructionsIndex < instructions.length) {
    const customAttributes = instructions.slice(
      featureInstructionsIndex,
      featureInstructionsIndex + customAttributesSize,
    );
    featureInstructionsIndex += customAttributesSize;

    const ringsCount = instructions[featureInstructionsIndex++];
    const holes = new Array(ringsCount - 1);
    let flatCoordsCount = 0;
    for (let i = 0; i < ringsCount; ++i) {
      const ringVertexCount = instructions[featureInstructionsIndex++];
      flatCoordsCount += ringVertexCount;
      if (i < ringsCount - 1) holes[i] = flatCoordsCount;
    }

    const flatCoords = instructions.slice(
      featureInstructionsIndex,
      featureInstructionsIndex + flatCoordsCount * instructionsPerVertex,
    );
    featureInstructionsIndex += flatCoordsCount * instructionsPerVertex;

    const triangles = earcut(flatCoords, holes, instructionsPerVertex);

    for (let i = 0; i < flatCoordsCount; ++i) {
      const base = (vertexOffset + i) * (2 + customAttributesSize);
      vertexAttributesBuffer[base] = flatCoords[i * 2];
      vertexAttributesBuffer[base + 1] = flatCoords[i * 2 + 1];
      for (let j = 0; j < customAttributesSize; ++j) {
        vertexAttributesBuffer[base + 2 + j] = customAttributes[j];
      }
    }

    for (let i = 0; i < triangles.length; ++i) {
      indicesBuffer[indexOffset + i] = triangles[i] + vertexOffset;
    }
    vertexOffset += flatCoordsCount;
    indexOffset += triangles.length;
  }

  return {
    indicesBuffer: (indexOffset < indicesBuffer.length) ? indicesBuffer.slice(0, indexOffset) : indicesBuffer,
    vertexAttributesBuffer,
    instanceAttributesBuffer: new Float32Array([]),
  };
}
