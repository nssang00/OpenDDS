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
  // + 2 instructions per line (for featureIndex and vertexOffset)
  // + 1 instruction per line (for vertices count)
  const totalInstructionsCount =
    3 * verticesCount +
    (1 + getCustomAttributesSize(customAttributes) + 2) * geometriesCount;
  
  if (
    !renderInstructions ||
    renderInstructions.length !== totalInstructionsCount
  ) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }
  
  let renderIndex = 0;
  let refCounter = 0;
  
  for (let featureIndex = 0; featureIndex < geometryRenderEntries.length; featureIndex++) {
    const entry = geometryRenderEntries[featureIndex];
    const geometry = entry.feature.getGeometry();
    const stride = geometry.getStride();
  
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

      // feature 인덱스와 vertex offset 저장
      renderInstructions[renderIndex++] = featureIndex;
      renderInstructions[renderIndex++] = offset / stride;
      
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

function generateLineStringBuffers_(renderInstructions, customAttributesSize, transform, features) {
  const customAttrsCount = customAttributesSize;
  const instructionsPerVertex = 3;

  let currentInstructionsIndex = 0;
  let totalSegments = 0;
  while (currentInstructionsIndex < renderInstructions.length) {
    currentInstructionsIndex += customAttrsCount;
    currentInstructionsIndex += 2; // featureIndex, vertexOffset
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

  currentInstructionsIndex = 0;
  while (currentInstructionsIndex < renderInstructions.length) {
    const customAttributes = [];
    for (let i = 0; i < customAttrsCount; ++i)
      customAttributes[i] = renderInstructions[currentInstructionsIndex + i];
    currentInstructionsIndex += customAttrsCount;
    
    // feature 정보 읽기
    const featureIndex = renderInstructions[currentInstructionsIndex++];
    const vertexStartOffset = renderInstructions[currentInstructionsIndex++];
    const verticesCount = renderInstructions[currentInstructionsIndex++];

    // feature에서 원본 좌표 가져오기
    const feature = features[featureIndex];
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const stride = geometry.getStride();

    const firstInstructionsIndex = currentInstructionsIndex;
    const lastInstructionsIndex = currentInstructionsIndex + (verticesCount - 1) * instructionsPerVertex;
    const isLoop =
      renderInstructions[firstInstructionsIndex] === renderInstructions[lastInstructionsIndex] &&
      renderInstructions[firstInstructionsIndex + 1] === renderInstructions[lastInstructionsIndex + 1];

    let currentLength = 0;
    let currentAngleTangentSum = 0;

    // 월드 좌표를 직접 가져오는 헬퍼 함수
    function getWorldCoord(vertexIndex) {
      if (vertexIndex < 0 || vertexIndex >= verticesCount) return null;
      const coordIndex = (vertexStartOffset + vertexIndex) * stride;
      return [
        flatCoordinates[coordIndex],
        flatCoordinates[coordIndex + 1]
      ];
    }

    for (let i = 0; i < verticesCount - 1; ++i) {
      const segmentStartIndex = currentInstructionsIndex + i * instructionsPerVertex;
      const segmentEndIndex   = currentInstructionsIndex + (i + 1) * instructionsPerVertex;
      const p0 = [renderInstructions[segmentStartIndex], renderInstructions[segmentStartIndex + 1]];
      const p1 = [renderInstructions[segmentEndIndex],   renderInstructions[segmentEndIndex + 1]];
      const m0 = renderInstructions[segmentStartIndex + 2];
      const m1 = renderInstructions[segmentEndIndex + 2];

      // 월드 좌표 직접 계산
      let pBworld = null, pAworld = null;
      if (i > 0) {
        pBworld = getWorldCoord(i - 1);
      } else if (isLoop) {
        pBworld = getWorldCoord(verticesCount - 2);
      }
      
      const p0world = getWorldCoord(i);
      const p1world = getWorldCoord(i + 1);
      
      if (i < verticesCount - 2) {
        pAworld = getWorldCoord(i + 2);
      } else if (isLoop) {
        pAworld = getWorldCoord(1);
      }

      function angleBetween(p0, pA, pB) {
        const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
        const bx = pB[0] - p0[0], by = pB[1] - p0[1];
        if ((ax * ax + ay * ay) < 1e-12 || (bx * bx + by * by) < 1e-12) return 0;
        const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
        return angle < 0 ? angle + 2 * Math.PI : angle;
      }

      let angle0 = -1, angle1 = -1;
      let newAngleTangentSum = currentAngleTangentSum;
      if (pBworld !== null) {
        angle0 = angleBetween(p0world, p1world, pBworld);
        if (Math.cos(angle0) <= 0.985) // LINESTRING_ANGLE_COSINE_CUTOFF
          newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
      }
      if (pAworld !== null) {
        angle1 = angleBetween(p1world, p0world, pAworld);
        if (Math.cos(angle1) <= 0.985) // LINESTRING_ANGLE_COSINE_CUTOFF
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
