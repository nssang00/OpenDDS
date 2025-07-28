//claude
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

//deepseek
function generatePolygonBuffers_(instructions, customAttributesSize) {
  const customAttrsCount = customAttributesSize;
  const instructionsPerVertex = 2;

  // 1. 첫 번째 패스: 버퍼 크기 계산 (변경 없음)
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

  // 2. 두 번째 패스: 버퍼 채우기 (최적화 적용)
  let instructionsIndex = 0;
  let vertexOffset = 0;
  let indexOffset = 0;
  
  // CustomAttributes용 임시 배열 (재사용)
  const customAttributes = new Array(customAttrsCount);
  
  while (instructionsIndex < instructions.length) {
    // 2-1. slice() 제거: 직접 배열 참조
    for (let j = 0; j < customAttrsCount; j++) {
      customAttributes[j] = instructions[instructionsIndex + j];
    }
    instructionsIndex += customAttrsCount;

    const ringsCount = instructions[instructionsIndex++];
    const holes = [];
    let verticesCount = 0;
    let holeOffset = 0;
    
    // 2-2. holes 배열 생성 최적화
    for (let i = 0; i < ringsCount; ++i) {
      const ringVertexCount = instructions[instructionsIndex++];
      if (i > 0) holes.push(verticesCount); // hole 시작점 기록
      verticesCount += ringVertexCount;
    }

    // 2-3. flatCoords 복사 제거: 원본 배열 직접 참조
    const flatCoordsStart = instructionsIndex;
    instructionsIndex += verticesCount * 2;

    // 2-4. earcut에 복사 없이 배열 전달 (라이브러리 수정 필요시)
    const result = earcut(
      instructions,               // 전체 배열 전달
      holes,                     
      instructionsPerVertex,
      flatCoordsStart,           // 시작 인덱스 추가
      verticesCount * 2           // 길이
    );

    // 2-5. 정점 버퍼 직접 채우기 (flatCoords 복사본 사용X)
    let baseIdx = vertexOffset * (2 + customAttrsCount);
    for (let i = 0; i < verticesCount; ++i) {
      const srcPos = flatCoordsStart + i * 2;
      vertices[baseIdx++] = instructions[srcPos];
      vertices[baseIdx++] = instructions[srcPos + 1];
      for (let j = 0; j < customAttrsCount; j++) {
        vertices[baseIdx++] = customAttributes[j];
      }
    }

    // 2-6. 인덱스 버퍼 채우기 (set()으로 일괄 복사)
    indices.set(result, indexOffset);
    indexOffset += result.length;
    vertexOffset += verticesCount;
  }

  return {
    indicesBuffer: indexOffset < indices.length ? indices.subarray(0, indexOffset) : indices,
    vertexAttributesBuffer: vertices,
    instanceAttributesBuffer: new Float32Array(0),
  };
}

//chatgpt
function generatePolygonBuffers_(instructions, customAttributesSize) {
  const customAttrsCount = customAttributesSize;
  const instructionsPerVertex = 2; // x, y

  let currentInstructionsIndex = 0;
  let totalVertexCount = 0;
  let maxTotalIndices = 0;

  // 1. 버퍼 사이즈 계산 (slice 없음)
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

  // 2. 실 데이터 작성 (slice 대신 index 직접 접근)
  while (instructionsIndex < instructions.length) {
    // Custom attributes
    const customAttributes = [];
    for (let j = 0; j < customAttrsCount; ++j) {
      customAttributes[j] = instructions[instructionsIndex++];
    }

    // Rings info
    const ringsCount = instructions[instructionsIndex++];
    const holes = new Array(ringsCount - 1);
    let verticesCount = 0;
    const ringVertexCounts = new Array(ringsCount);

    for (let i = 0; i < ringsCount; ++i) {
      const ringVertexCount = instructions[instructionsIndex++];
      ringVertexCounts[i] = ringVertexCount;
      verticesCount += ringVertexCount;
      if (i < ringsCount - 1) holes[i] = verticesCount;
    }

    // flatCoords 복사 없이 earcut에 전달
    // earcut은 flat array만 받으므로, 현재 인덱스에서 데이터 부분만 slice 해야 함
    // (만약 earcut이 offset 지원한다면 slice 불필요)
    const flatCoordsStart = instructionsIndex;
    const flatCoordsEnd = instructionsIndex + verticesCount * instructionsPerVertex;
    // slice 최소화
    const flatCoords = instructions.subarray
      ? instructions.subarray(flatCoordsStart, flatCoordsEnd)
      : instructions.slice(flatCoordsStart, flatCoordsEnd);

    const result = earcut(flatCoords, holes, instructionsPerVertex);

    // vertices buffer 기록
    // 버퍼에 직접 기록, customAttrsCount가 0이면 내부 for 생략
    for (let i = 0; i < verticesCount; ++i) {
      const base = (vertexOffset + i) * (2 + customAttrsCount);
      vertices[base] = flatCoords[i * 2];
      vertices[base + 1] = flatCoords[i * 2 + 1];
      if (customAttrsCount > 0) {
        for (let j = 0; j < customAttrsCount; ++j) {
          vertices[base + 2 + j] = customAttributes[j];
        }
      }
    }

    // indices buffer 기록
    for (let i = 0; i < result.length; ++i) {
      indices[indexOffset + i] = result[i] + vertexOffset;
    }
    vertexOffset += verticesCount;
    indexOffset += result.length;

    instructionsIndex = flatCoordsEnd;
  }

  // 3. 필요한 만큼만 반환
  return {
    indicesBuffer: (indexOffset < indices.length) ? indices.slice(0, indexOffset) : indices,
    vertexAttributesBuffer: vertices,
    instanceAttributesBuffer: new Float32Array([]),
  };
}
