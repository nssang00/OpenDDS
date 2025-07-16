export function generateLineStringRenderInstructionsFromFeatures(
  features,
  renderInstructions,
  customAttributes,
  transform,
) {
  let verticesCount = 0;
  let geometriesCount = 0;
  
  // 배열을 features 길이만큼 미리 생성
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
}

/////////
export function generatePointRenderInstructionsFromFeatures(
  features,
  renderInstructions,
  customAttributes,
  transform,
) {
  const geometriesCount = features.length;
  const geometryRenderEntries = new Array(geometriesCount);

  for (let i = 0; i < geometriesCount; i++) {
    const feature = features[i];
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();

    // 변환
    const pixelCoordinates = new Array(flatCoordinates.length);
    pixelCoordinates[0] = transform[0] * flatCoordinates[0] + transform[2] * flatCoordinates[1] + transform[4];
    pixelCoordinates[1] = transform[1] * flatCoordinates[0] + transform[3] * flatCoordinates[1] + transform[5];

    geometryRenderEntries[i] = { feature, pixelCoordinates };
  }

  // ... 이후 renderInstructions, customAttributes 사용 로직
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
