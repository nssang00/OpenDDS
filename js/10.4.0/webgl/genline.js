function generateLineStringBuffers_(renderInstructions, customAttributesSize, transform) {
  const customAttrsCount = customAttributesSize;
  const instructionsPerVertex = 3;
  const floatsPerSegment = 2+1+2+1+2+1+1+customAttrsCount;
  const invertTransform = createTransform();
  makeInverseTransform(invertTransform, transform);

  let currentInstructionsIndex = 0;
  let totalSegments = 0;
  while (currentInstructionsIndex < renderInstructions.length) {
    currentInstructionsIndex += customAttrsCount;
    const verticesCount = renderInstructions[currentInstructionsIndex++];
    totalSegments += (verticesCount - 1);
    currentInstructionsIndex += verticesCount * instructionsPerVertex;
  }
  const totalFloats = totalSegments * floatsPerSegment;
  const instanceAttributes = new Float32Array(totalFloats);
  let bufferPos = 0;

  currentInstructionsIndex = 0;
  while (currentInstructionsIndex < renderInstructions.length) {
    // customAttributes
    const customAttributes = [];
    for (let i = 0; i < customAttrsCount; ++i)
      customAttributes[i] = renderInstructions[currentInstructionsIndex + i];
    currentInstructionsIndex += customAttrsCount;
    const verticesCount = renderInstructions[currentInstructionsIndex++];

    const baseIdx = currentInstructionsIndex;
    const idxToInstr = idx => baseIdx + idx * instructionsPerVertex;

    // loop 여부
    const firstInstructionsIndex = currentInstructionsIndex;
    const lastInstructionsIndex = currentInstructionsIndex + (verticesCount - 1) * instructionsPerVertex;
    const isLoop =
      renderInstructions[firstInstructionsIndex] === renderInstructions[lastInstructionsIndex] &&
      renderInstructions[firstInstructionsIndex + 1] === renderInstructions[lastInstructionsIndex + 1];

    let currentLength = 0;
    let currentAngleTangentSum = 0;

    // ===== 슬라이딩 윈도우 캐시 최적화 =====
    let worldB = null, world0 = null, world1 = null, worldA = null;
    let cachedIdxB = -1, cachedIdx0 = -1, cachedIdx1 = -1, cachedIdxA = -1;

    function getWorld(idx) {
      if (idx === null || idx < 0 || idx >= verticesCount) return null;
      
      // 캐시 히트 확인
      if (idx === cachedIdxB) return worldB;
      if (idx === cachedIdx0) return world0;
      if (idx === cachedIdx1) return world1;
      if (idx === cachedIdxA) return worldA;
      
      // 캐시 미스 - 계산 후 적절한 위치에 저장
      const instrIdx = idxToInstr(idx);
      const world = applyTransform(invertTransform, [
        renderInstructions[instrIdx],
        renderInstructions[instrIdx + 1]
      ]);
      
      // 순차적 접근 패턴을 고려한 캐시 배치
      // 다음 iteration에서 사용될 가능성이 높은 순서로 배치
      if (idx === cachedIdx0 + 1) {
        // 슬라이딩: B <- 0, 0 <- 1, 1 <- new, A는 유지 또는 교체
        worldB = world0;
        cachedIdxB = cachedIdx0;
        world0 = world1;
        cachedIdx0 = cachedIdx1;
        world1 = world;
        cachedIdx1 = idx;
      } else {
        // 일반적인 경우: 가장 오래된 것을 교체
        worldA = world;
        cachedIdxA = idx;
      }
      
      return world;
    }

    for (let i = 0; i < verticesCount - 1; ++i) {
      // idx 계산
      const idx0 = i;
      const idx1 = i + 1;
      const idxB = (i > 0) ? i - 1 : (isLoop ? verticesCount - 2 : null);
      const idxA = (i < verticesCount - 2) ? i + 2 : (isLoop ? 1 : null);

      const p0idx = idxToInstr(idx0);
      const p1idx = idxToInstr(idx1);
      const p0 = [renderInstructions[p0idx], renderInstructions[p0idx + 1], renderInstructions[p0idx + 2]];
      const p1 = [renderInstructions[p1idx], renderInstructions[p1idx + 1], renderInstructions[p1idx + 2]];
      
      const p0world = getWorld(idx0);
      const p1world = getWorld(idx1);
      const pBworld = getWorld(idxB);
      const pAworld = getWorld(idxA);

      function angleBetween(p0, pA, pB) {
        const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
        const bx = pB[0] - p0[0], by = pB[1] - p0[1];
        if ((ax * ax + ay * ay) < 1e-12 || (bx * bx + by * by) < 1e-12) return 0;
        const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
        return angle < 0 ? angle + 2 * Math.PI : angle;
      }

      let angle0 = -1, angle1 = -1;
      let newAngleTangentSum = currentAngleTangentSum;
      if (pBworld) {
        angle0 = angleBetween(p0world, p1world, pBworld);
        if (Math.cos(angle0) <= 0.985)
          newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
      }
      if (pAworld) {
        angle1 = angleBetween(p1world, p0world, pAworld);
        if (Math.cos(angle1) <= 0.985)
          newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
      }

      // 기록
      instanceAttributes[bufferPos++] = p0[0];
      instanceAttributes[bufferPos++] = p0[1];
      instanceAttributes[bufferPos++] = p0[2];
      instanceAttributes[bufferPos++] = p1[0];
      instanceAttributes[bufferPos++] = p1[1];
      instanceAttributes[bufferPos++] = p1[2];
      instanceAttributes[bufferPos++] = angle0;
      instanceAttributes[bufferPos++] = angle1;
      instanceAttributes[bufferPos++] = currentLength;
      instanceAttributes[bufferPos++] = currentAngleTangentSum;
      for (let j = 0; j < customAttrsCount; ++j)
        instanceAttributes[bufferPos++] = customAttributes[j];

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

///////////
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
  let bufferPos = 0;

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

    const worldCache = new Array(verticesCount);

    function getWorld(idx) {
      if (idx === null || idx < 0 || idx >= verticesCount) return null;
      if (!worldCache[idx]) {
        const instrIdx = currentInstructionsIndex + idx * instructionsPerVertex;
        worldCache[idx] = applyTransform(invertTransform, [
          renderInstructions[instrIdx],
          renderInstructions[instrIdx + 1]
        ]);
      }
      return worldCache[idx];
    }

    for (let i = 0; i < verticesCount - 1; ++i) {
      let beforeIndex = null;
      if (i > 0) beforeIndex = currentInstructionsIndex + (i - 1) * instructionsPerVertex;
      else if (isLoop) beforeIndex = currentInstructionsIndex + (verticesCount - 2) * instructionsPerVertex;
      let afterIndex = null;
      if (i < verticesCount - 2) afterIndex = currentInstructionsIndex + (i + 2) * instructionsPerVertex;
      else if (isLoop) afterIndex = currentInstructionsIndex + instructionsPerVertex;

      const segmentStartIndex = currentInstructionsIndex + i * instructionsPerVertex;
      const segmentEndIndex   = currentInstructionsIndex + (i + 1) * instructionsPerVertex;
      const idx0 = (segmentStartIndex - currentInstructionsIndex) / instructionsPerVertex;
      const idx1 = (segmentEndIndex   - currentInstructionsIndex) / instructionsPerVertex;
      let idxB = null, idxA = null;
      if (beforeIndex !== null)
        idxB = (beforeIndex - currentInstructionsIndex) / instructionsPerVertex;
      if (afterIndex !== null)
        idxA = (afterIndex - currentInstructionsIndex) / instructionsPerVertex;

      const p0 = [
        renderInstructions[segmentStartIndex],
        renderInstructions[segmentStartIndex + 1],
        renderInstructions[segmentStartIndex + 2]
      ];
      const p1 = [
        renderInstructions[segmentEndIndex],
        renderInstructions[segmentEndIndex + 1],
        renderInstructions[segmentEndIndex + 2]
      ];

      const p0world = getWorld(idx0);
      const p1world = getWorld(idx1);
      const pBworld = getWorld(idxB);
      const pAworld = getWorld(idxA);

      function angleBetween(p0, pA, pB) {
        const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
        const bx = pB[0] - p0[0], by = pB[1] - p0[1];
        if ((ax * ax + ay * ay) < 1e-12 || (bx * bx + by * by) < 1e-12) return 0;
        const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
        return angle < 0 ? angle + 2 * Math.PI : angle;
      }

      let angle0 = -1, angle1 = -1;
      let newAngleTangentSum = currentAngleTangentSum;
      if (pBworld) {
        angle0 = angleBetween(p0world, p1world, pBworld);
        if (Math.cos(angle0) <= 0.985)
          newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
      }
      if (pAworld) {
        angle1 = angleBetween(p1world, p0world, pAworld);
        if (Math.cos(angle1) <= 0.985)
          newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
      }

      // 기록
      instanceAttributes[bufferPos++] = p0[0];
      instanceAttributes[bufferPos++] = p0[1];
      instanceAttributes[bufferPos++] = p0[2];
      instanceAttributes[bufferPos++] = p1[0];
      instanceAttributes[bufferPos++] = p1[1];
      instanceAttributes[bufferPos++] = p1[2];
      instanceAttributes[bufferPos++] = angle0;
      instanceAttributes[bufferPos++] = angle1;
      instanceAttributes[bufferPos++] = currentLength;
      instanceAttributes[bufferPos++] = currentAngleTangentSum;
      for (let j = 0; j < customAttrsCount; ++j)
        instanceAttributes[bufferPos++] = customAttributes[j];

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



///////////
function generateLineStringBuffers_(renderInstructions, customAttributesSize, transform) {
  const customAttrsCount = customAttributesSize;
  const instructionsPerVertex = 3;
  const floatsPerSegment = 2+1+2+1+2+1+1+customAttrsCount;
  const invertTransform = createTransform();
  makeInverseTransform(invertTransform, transform);

  let currentInstructionsIndex = 0;
  let totalSegments = 0;
  while (currentInstructionsIndex < renderInstructions.length) {
    currentInstructionsIndex += customAttrsCount;
    const verticesCount = renderInstructions[currentInstructionsIndex++];
    totalSegments += (verticesCount - 1);
    currentInstructionsIndex += verticesCount * instructionsPerVertex;
  }
  const totalFloats = totalSegments * floatsPerSegment;
  const instanceAttributes = new Float32Array(totalFloats);
  let bufferPos = 0;

  currentInstructionsIndex = 0;
  while (currentInstructionsIndex < renderInstructions.length) {
    // customAttributes
    const customAttributes = [];
    for (let i = 0; i < customAttrsCount; ++i)
      customAttributes[i] = renderInstructions[currentInstructionsIndex + i];
    currentInstructionsIndex += customAttrsCount;
    const verticesCount = renderInstructions[currentInstructionsIndex++];

    const baseIdx = currentInstructionsIndex;
    const idxToInstr = idx => baseIdx + idx * instructionsPerVertex;

    // loop 여부
    const firstInstructionsIndex = currentInstructionsIndex;
    const lastInstructionsIndex = currentInstructionsIndex + (verticesCount - 1) * instructionsPerVertex;
    const isLoop =
      renderInstructions[firstInstructionsIndex] === renderInstructions[lastInstructionsIndex] &&
      renderInstructions[firstInstructionsIndex + 1] === renderInstructions[lastInstructionsIndex + 1];

    let currentLength = 0;
    let currentAngleTangentSum = 0;

    // ===== 최소 수정 캐시 =====
    const worldCache = new Array(verticesCount);

    function getWorld(idx) {
      if (idx === null || idx < 0 || idx >= verticesCount) return null;
      if (!worldCache[idx]) {
        const instrIdx = idxToInstr(idx);
        worldCache[idx] = applyTransform(invertTransform, [
          renderInstructions[instrIdx],
          renderInstructions[instrIdx + 1]
        ]);
      }
      return worldCache[idx];
    }

    for (let i = 0; i < verticesCount - 1; ++i) {
      // idx 계산 (기존 코드 거의 그대로 유지)
      const idx0 = i;
      const idx1 = i + 1;
      const idxB = (i > 0) ? i - 1 : (isLoop ? verticesCount - 2 : null);
      const idxA = (i < verticesCount - 2) ? i + 2 : (isLoop ? 1 : null);

      const p0idx = idxToInstr(idx0);
      const p1idx = idxToInstr(idx1);
      const p0 = [renderInstructions[p0idx], renderInstructions[p0idx + 1], renderInstructions[p0idx + 2]];
      const p1 = [renderInstructions[p1idx], renderInstructions[p1idx + 1], renderInstructions[p1idx + 2]];
      const p0world = getWorld(idx0);
      const p1world = getWorld(idx1);
      const pBworld = getWorld(idxB);
      const pAworld = getWorld(idxA);

      function angleBetween(p0, pA, pB) {
        const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
        const bx = pB[0] - p0[0], by = pB[1] - p0[1];
        if ((ax * ax + ay * ay) < 1e-12 || (bx * bx + by * by) < 1e-12) return 0;
        const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
        return angle < 0 ? angle + 2 * Math.PI : angle;
      }

      let angle0 = -1, angle1 = -1;
      let newAngleTangentSum = currentAngleTangentSum;
      if (pBworld) {
        angle0 = angleBetween(p0world, p1world, pBworld);
        if (Math.cos(angle0) <= 0.985)
          newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
      }
      if (pAworld) {
        angle1 = angleBetween(p1world, p0world, pAworld);
        if (Math.cos(angle1) <= 0.985)
          newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
      }

      // 기록
      instanceAttributes[bufferPos++] = p0[0];
      instanceAttributes[bufferPos++] = p0[1];
      instanceAttributes[bufferPos++] = p0[2];
      instanceAttributes[bufferPos++] = p1[0];
      instanceAttributes[bufferPos++] = p1[1];
      instanceAttributes[bufferPos++] = p1[2];
      instanceAttributes[bufferPos++] = angle0;
      instanceAttributes[bufferPos++] = angle1;
      instanceAttributes[bufferPos++] = currentLength;
      instanceAttributes[bufferPos++] = currentAngleTangentSum;
      for (let j = 0; j < customAttrsCount; ++j)
        instanceAttributes[bufferPos++] = customAttributes[j];

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
