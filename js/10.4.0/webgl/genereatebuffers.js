generateBuffers(geometryBatch, transform) {
  if (geometryBatch.isEmpty()) {
    return null;
  }

  // Render instructions 생성
  const renderInstructions = this.generateRenderInstructions_(geometryBatch, transform);

  // 각 geometryType별 버퍼 생성
  const polygonBuffers = renderInstructions.polygonInstructions
    ? this.generatePolygonBuffers_(renderInstructions.polygonInstructions)
    : null;

  const lineStringBuffers = renderInstructions.lineStringInstructions
    ? this.generateLineStringBuffers_(renderInstructions.lineStringInstructions, transform)
    : null;

  const pointBuffers = renderInstructions.pointInstructions
    ? this.generatePointBuffers_(renderInstructions.pointInstructions)
    : null;

  // transform의 역변환 생성
  const invertVerticesTransform = makeInverseTransform(createTransform(), transform);

  // 결과 리턴
  return {
    polygonBuffers,
    lineStringBuffers,
    pointBuffers,
    invertVerticesTransform,
  };
}


function generatePolygonBuffers_(instructions) {
  const customAttributesSize = getCustomAttributesSize(this.customAttributes_);

  // 1. 전체 vertex 개수 계산
  let tmpIndex = 0, totalVertices = 0, maxTotalIndices = 0;
  const vertexCountsPerPolygon = [];
  while (tmpIndex < instructions.length) {
    tmpIndex += customAttributesSize;
    const ringCount = instructions[tmpIndex++];
    let vertexCount = 0;
    for (let i = 0; i < ringCount; ++i)
      vertexCount += instructions[tmpIndex++];
    tmpIndex += vertexCount * 2;
    totalVertices += vertexCount;
    vertexCountsPerPolygon.push(vertexCount);
    // 인덱스 최대치(완전 삼각분할 기준, 넉넉하게)
    maxTotalIndices += vertexCount * 3;
  }

  // 2. 버퍼 할당
  const vertices = new Float32Array(totalVertices * (2 + customAttributesSize));
  const indices  = new Uint32Array(maxTotalIndices);

  // 3. 버퍼 채우기
  let curInstruction = 0, vtxOffset = 0, idxOffset = 0, polyIdx = 0;
  while (curInstruction < instructions.length) {
    // Custom 속성 읽기
    const customAttrs = instructions.slice(curInstruction, curInstruction + customAttributesSize);
    curInstruction += customAttributesSize;

    // Ring 구조 파싱
    const ringCount = instructions[curInstruction++];
    const holes = [];
    let vertexCount = 0;
    const ringVertexCounts = [];
    for (let i = 0; i < ringCount; ++i) {
      const cnt = instructions[curInstruction++];
      if (i > 0) holes.push(vertexCount);
      vertexCount += cnt;
      ringVertexCounts.push(cnt);
    }

    // 좌표 추출
    const coords = instructions.slice(curInstruction, curInstruction + vertexCount * 2);
    curInstruction += vertexCount * 2;

    // Triangulate
    const triIndices = earcut(coords, holes, 2);

    // 버퍼에 직접 쓰기 (vertex)
    for (let i = 0; i < vertexCount; ++i) {
      const base = (vtxOffset + i) * (2 + customAttributesSize);
      vertices[base + 0] = coords[i * 2];
      vertices[base + 1] = coords[i * 2 + 1];
      for (let j = 0; j < customAttributesSize; ++j) {
        vertices[base + 2 + j] = customAttrs[j];
      }
    }
    // 인덱스 저장 (vertex 오프셋 적용)
    for (let i = 0; i < triIndices.length; ++i) {
      indices[idxOffset + i] = triIndices[i] + vtxOffset;
    }
    vtxOffset += vertexCount;
    idxOffset += triIndices.length;
    polyIdx++;
  }

  // 4. indices slice (실제 쓴 만큼만 잘라서 전달)
  const finalIndices = (idxOffset < indices.length) ? indices.slice(0, idxOffset) : indices;

  return [
    new WebGLArrayBuffer(ELEMENT_ARRAY_BUFFER, DYNAMIC_DRAW).fromArray(finalIndices),
    new WebGLArrayBuffer(ARRAY_BUFFER, DYNAMIC_DRAW).fromArray(vertices),
    new WebGLArrayBuffer(ARRAY_BUFFER, DYNAMIC_DRAW) // Empty instance buffer
  ];
}


generateLineStringBuffers_(renderInstructions, transform) {
  const customAttrsCount = getCustomAttributesSize(this.customAttributes_);
  const instructionsPerVertex = 3; // x, y, m

  // === 1. 총 세그먼트 수 계산 ===
  let currentInstructionsIndex = 0;
  let totalSegments = 0;
  while (currentInstructionsIndex < renderInstructions.length) {
    // 커스텀 속성 건너뜀
    currentInstructionsIndex += customAttrsCount;
    const verticesCount = renderInstructions[currentInstructionsIndex++];
    totalSegments += (verticesCount - 1);
    currentInstructionsIndex += verticesCount * instructionsPerVertex;
  }

  // === 2. 할당 크기 계산 ===
  const floatsPerSegment = 10 + customAttrsCount; // p0(x,y,m), p1(x,y,m), angle0, angle1, len, sum, ...custom
  const totalFloats = totalSegments * floatsPerSegment;
  const instanceAttributes = new Float32Array(totalFloats);
  let bufferPos = 0;

  // === 3. 실제 데이터 채우기 ===
  const invertTransform = createTransform();
  makeInverseTransform(invertTransform, transform);

  currentInstructionsIndex = 0;
  while (currentInstructionsIndex < renderInstructions.length) {
    // 커스텀 속성
    const customAttributes = [];
    for (let i = 0; i < customAttrsCount; ++i) {
      customAttributes[i] = renderInstructions[currentInstructionsIndex + i];
    }
    currentInstructionsIndex += customAttrsCount;
    const verticesCount = renderInstructions[currentInstructionsIndex++];

    const firstInstructionsIndex = currentInstructionsIndex;
    const lastInstructionsIndex = currentInstructionsIndex + (verticesCount - 1) * instructionsPerVertex;
    const isLoop =
      renderInstructions[firstInstructionsIndex] === renderInstructions[lastInstructionsIndex] &&
      renderInstructions[firstInstructionsIndex + 1] === renderInstructions[lastInstructionsIndex + 1];

    let currentLength = 0;
    let currentAngleTangentSum = 0;

    for (let i = 0; i < verticesCount - 1; i++) {
      let beforeIndex = null;
      if (i > 0) beforeIndex = currentInstructionsIndex + (i - 1) * instructionsPerVertex;
      else if (isLoop) beforeIndex = lastInstructionsIndex - instructionsPerVertex;
      let afterIndex = null;
      if (i < verticesCount - 2) afterIndex = currentInstructionsIndex + (i + 2) * instructionsPerVertex;
      else if (isLoop) afterIndex = firstInstructionsIndex + instructionsPerVertex;

      const segmentStartIndex = currentInstructionsIndex + i * instructionsPerVertex;
      const segmentEndIndex   = currentInstructionsIndex + (i + 1) * instructionsPerVertex;
      const p0 = [renderInstructions[segmentStartIndex], renderInstructions[segmentStartIndex + 1]];
      const p1 = [renderInstructions[segmentEndIndex],   renderInstructions[segmentEndIndex + 1]];
      const m0 = renderInstructions[segmentStartIndex + 2];
      const m1 = renderInstructions[segmentEndIndex + 2];
      const p0world = applyTransform(invertTransform, [...p0]);
      const p1world = applyTransform(invertTransform, [...p1]);

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
        const pB = [renderInstructions[beforeIndex], renderInstructions[beforeIndex + 1]];
        const pBworld = applyTransform(invertTransform, [...pB]);
        angle0 = angleBetween(p0world, p1world, pBworld);
        if (Math.cos(angle0) <= LINESTRING_ANGLE_COSINE_CUTOFF) {
          newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
        }
      }
      if (afterIndex !== null) {
        const pA = [renderInstructions[afterIndex], renderInstructions[afterIndex + 1]];
        const pAworld = applyTransform(invertTransform, [...pA]);
        angle1 = angleBetween(p1world, p0world, pAworld);
        if (Math.cos(angle1) <= LINESTRING_ANGLE_COSINE_CUTOFF) {
          newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
        }
      }

      // === push 대신 직접 할당 ===
      instanceAttributes[bufferPos++] = p0[0];
      instanceAttributes[bufferPos++] = p0[1];
      instanceAttributes[bufferPos++] = m0;
      instanceAttributes[bufferPos++] = p1[0];
      instanceAttributes[bufferPos++] = p1[1];
      instanceAttributes[bufferPos++] = m1;
      instanceAttributes[bufferPos++] = angle0;
      instanceAttributes[bufferPos++] = angle1;
      instanceAttributes[bufferPos++] = currentLength;
      instanceAttributes[bufferPos++] = currentAngleTangentSum;
      for (let j = 0; j < customAttrsCount; ++j) {
        instanceAttributes[bufferPos++] = customAttributes[j];
      }

      currentLength += Math.sqrt(
        (p1world[0] - p0world[0]) * (p1world[0] - p0world[0]) +
        (p1world[1] - p0world[1]) * (p1world[1] - p0world[1])
      );
      currentAngleTangentSum = newAngleTangentSum;
    }
    currentInstructionsIndex += verticesCount * instructionsPerVertex;
  }

  const vertexAttributesBuffer = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);
  const indicesBuffer  = new Uint32Array([0, 1, 3, 1, 2, 3]);

  return [
    new WebGLArrayBuffer(ELEMENT_ARRAY_BUFFER, DYNAMIC_DRAW).fromArray(indicesBuffer),
    new WebGLArrayBuffer(ARRAY_BUFFER, DYNAMIC_DRAW).fromArray(vertexAttributesBuffer),
    new WebGLArrayBuffer(ARRAY_BUFFER, DYNAMIC_DRAW).fromArray(instanceAttributes)
  ];
}

/////////////

generateBuffersForType_(renderInstructions, geometryType, transform) {
  if (!renderInstructions) return null;

  switch (geometryType) {
    case 'Point':
      return this.generatePointBuffers_(renderInstructions);
    case 'LineString':
      return this.generateLineStringBuffers_(renderInstructions, transform);
    case 'Polygon':
      return this.generatePolygonBuffers_(renderInstructions);
    default:
      return null;
  }
}

// Point buffer generation
generatePointBuffers_(instructions) {
  const customAttributesSize = getCustomAttributesSize(this.customAttributes_);
  const instructionsPerElement = 2 + customAttributesSize;
  const elementCount = instructions.length / instructionsPerElement;
  
  const instanceAttributes = new Float32Array(
    elementCount * (2 + customAttributesSize)
  );

  let bufferPosition = 0;
  for (let i = 0; i < instructions.length; i += instructionsPerElement) {
    // Position
    instanceAttributes[bufferPosition++] = instructions[i];     // x
    instanceAttributes[bufferPosition++] = instructions[i + 1]; // y
    
    // Custom attributes
    for (let j = 0; j < customAttributesSize; j++) {
      instanceAttributes[bufferPosition++] = instructions[i + 2 + j];
    }
  }

  const indicesBuffer  = new Uint32Array([0, 1, 3, 1, 2, 3]);  
  const vertexAttributesBuffer = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);

  return [
    new WebGLArrayBuffer(ELEMENT_ARRAY_BUFFER, DYNAMIC_DRAW).fromArray(indicesBuffer),
    new WebGLArrayBuffer(ARRAY_BUFFER, DYNAMIC_DRAW).fromArray(vertexAttributesBuffer),
    new WebGLArrayBuffer(ARRAY_BUFFER, DYNAMIC_DRAW).fromArray(instanceAttributes)
  ];
}

generateLineStringBuffers_(renderInstructions, transform) {
    const customAttrsCount = getCustomAttributesSize(this.customAttributes_);
    const instructionsPerVertex = 3; // x, y, m
    const instanceAttributes = [];
    
    const invertTransform = createTransform();
    makeInverseTransform(invertTransform, transform);
  
    let currentInstructionsIndex = 0;
    let verticesCount, customAttributes;
    while (currentInstructionsIndex < renderInstructions.length) {
      customAttributes = [];
      for (let i = 0; i < customAttrsCount; ++i) {
        customAttributes[i] = renderInstructions[currentInstructionsIndex + i];
      }   
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
  
      // segment iteration
      for (let i = 0; i < verticesCount - 1; i++) {
        // === writeLineSegmentToBuffers inlined ===
        let beforeIndex = null;
        if (i > 0) {
          beforeIndex = currentInstructionsIndex + (i - 1) * instructionsPerVertex;
        } else if (isLoop) {
          beforeIndex = lastInstructionsIndex - instructionsPerVertex;
        }
        let afterIndex = null;
        if (i < verticesCount - 2) {
          afterIndex = currentInstructionsIndex + (i + 2) * instructionsPerVertex;
        } else if (isLoop) {
          afterIndex = firstInstructionsIndex + instructionsPerVertex;
        }
  
        // P0, P1
        const segmentStartIndex = currentInstructionsIndex + i * instructionsPerVertex;
        const segmentEndIndex = currentInstructionsIndex + (i + 1) * instructionsPerVertex;
        const p0 = [renderInstructions[segmentStartIndex], renderInstructions[segmentStartIndex + 1]];
        const p1 = [renderInstructions[segmentEndIndex], renderInstructions[segmentEndIndex + 1]];
        const m0 = renderInstructions[segmentStartIndex + 2];
        const m1 = renderInstructions[segmentEndIndex + 2];
  
        // toWorldTransform
        const p0world = applyTransform(invertTransform, [...p0]);
        const p1world = applyTransform(invertTransform, [...p1]);
  
        // join/cap angles
        function angleBetween(p0, pA, pB) {
          const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
          const bx = pB[0] - p0[0], by = pB[1] - p0[1];
          if ((ax * ax + ay * ay) < 1e-12 || (bx * bx + by * by) < 1e-12) return 0;
          const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
          return angle < 0 ? angle + 2 * Math.PI : angle;
        }
        let angle0 = -1, angle1 = -1;
        let newAngleTangentSum = currentAngleTangentSum;
  
        // joinBefore
        if (beforeIndex !== null) {
          const pB = [
            renderInstructions[beforeIndex],
            renderInstructions[beforeIndex + 1],
          ];
          const pBworld = applyTransform(invertTransform, [...pB]);
          angle0 = angleBetween(p0world, p1world, pBworld);

          if (Math.cos(angle0) <= LINESTRING_ANGLE_COSINE_CUTOFF) {
            newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
          }
        }
        // joinAfter
        if (afterIndex !== null) {
          const pA = [
            renderInstructions[afterIndex],
            renderInstructions[afterIndex + 1],
          ];
          const pAworld = applyTransform(invertTransform, [...pA]);
          angle1 = angleBetween(p1world, p0world, pAworld);
          if (Math.cos(angle1) <= LINESTRING_ANGLE_COSINE_CUTOFF) {
            newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
          }
        }
  
        // instanceAttributes push
        instanceAttributes.push(
          p0[0], p0[1], m0,
          p1[0], p1[1], m1,
          angle0, angle1,
          currentLength,
          currentAngleTangentSum,
          ...customAttributes
        );
  
        // segment length, angle
        currentLength += Math.sqrt(
          (p1world[0] - p0world[0]) * (p1world[0] - p0world[0]) +
          (p1world[1] - p0world[1]) * (p1world[1] - p0world[1])
        );
        currentAngleTangentSum = newAngleTangentSum;
      }
      currentInstructionsIndex += verticesCount * instructionsPerVertex;
    }
  
    const vertexAttributesBuffer = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);
    const indicesBuffer  = new Uint32Array([0, 1, 3, 1, 2, 3]);
    const instanceAttributesBuffer = new Float32Array(instanceAttributes);
  
    return [
      new WebGLArrayBuffer(ELEMENT_ARRAY_BUFFER, DYNAMIC_DRAW).fromArray(indicesBuffer),
      new WebGLArrayBuffer(ARRAY_BUFFER, DYNAMIC_DRAW).fromArray(vertexAttributesBuffer),
      new WebGLArrayBuffer(ARRAY_BUFFER, DYNAMIC_DRAW).fromArray(instanceAttributesBuffer)
    ];
  }
  

// Polygon buffer generation
generatePolygonBuffers_(instructions) {
  const customAttributesSize = getCustomAttributesSize(this.customAttributes_);
  const vertices = [];
  const indices = [];
  
  let currentIndex = 0;
  while (currentIndex < instructions.length) {
    const customAttrs = instructions.slice(
      currentIndex,
      currentIndex + customAttributesSize
    );
    currentIndex += customAttributesSize;
    
    const ringCount = instructions[currentIndex++];
    const holes = [];
    let vertexCount = 0;
    
    // Read ring vertex counts
    for (let i = 0; i < ringCount; i++) {
      const ringVertexCount = instructions[currentIndex++];
      if (i > 0) holes.push(vertexCount);
      vertexCount += ringVertexCount;
    }
    
    // Extract polygon coordinates
    const coords = instructions.slice(
      currentIndex,
      currentIndex + vertexCount * 2
    );
    currentIndex += vertexCount * 2;
    
    // Triangulate polygon
    const triIndices = earcut(coords, holes, 2);
    
    // Create vertices with custom attributes
    for (let i = 0; i < coords.length; i += 2) {
      vertices.push(coords[i], coords[i + 1], ...customAttrs);
    }
    
    // Offset indices for current polygon
    const indexOffset = vertices.length / (2 + customAttributesSize) - vertexCount;
    for (const index of triIndices) {
      indices.push(index + indexOffset);
    }
  }

  return [
    new WebGLArrayBuffer(ELEMENT_ARRAY_BUFFER, DYNAMIC_DRAW).fromArray(indices),
    new WebGLArrayBuffer(ARRAY_BUFFER, DYNAMIC_DRAW).fromArray(vertices),
    new WebGLArrayBuffer(ARRAY_BUFFER, DYNAMIC_DRAW) // Empty instance buffer
  ];
}

