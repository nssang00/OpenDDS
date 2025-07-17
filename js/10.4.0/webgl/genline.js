function generateLineStringBuffers_(renderInstructions, customAttributesSize, transform) {
  const customAttrsCount = customAttributesSize;
  const instructionsPerVertex = 3;
  const floatsPerSegment = 2+1+2+1+2+1+1+customAttrsCount;
  const invertTransform = createTransform();
  makeInverseTransform(invertTransform, transform);

  let currentInstructionsIndex = 0;
  let totalSegments = 0;
  // Prepass: segment count
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

    // ---- 1. 캐시 4개(pB, p0, p1, pA) 초기화 ----
    const cache = [null, null, null, null];
    // idx: pB(-1), p0(0), p1(1), pA(2)
    for (let k = -1; k <= 2; ++k) {
      let idx = null;
      if (k === -1) idx = isLoop ? verticesCount - 2 : null;
      else if (k < verticesCount) idx = k;
      else idx = isLoop ? 1 : null;

      if (idx !== null) {
        const instrIdx = idxToInstr(idx);
        cache[k + 1] = applyTransform(invertTransform, [
          renderInstructions[instrIdx],
          renderInstructions[instrIdx + 1]
        ]);
      } else {
        cache[k + 1] = null;
      }
    }

    for (let i = 0; i < verticesCount - 1; ++i) {
      // cache: [pB, p0, p1, pA]
      const pBworld = cache[0];
      const p0world = cache[1];
      const p1world = cache[2];
      const pAworld = cache[3];

      const p0idx = idxToInstr(i);
      const p1idx = idxToInstr(i + 1);
      const p0 = [renderInstructions[p0idx], renderInstructions[p0idx + 1], renderInstructions[p0idx + 2]];
      const p1 = [renderInstructions[p1idx], renderInstructions[p1idx + 1], renderInstructions[p1idx + 2]];

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

      // ---- 2. 캐시 shift 및 신규 pA 갱신 ----
      cache[0] = cache[1];
      cache[1] = cache[2];
      cache[2] = cache[3];
      // nextA index 계산
      let nextAIdx = null;
      if (i + 2 < verticesCount) nextAIdx = i + 2;
      else if (isLoop) nextAIdx = 1;
      // nextA 값 갱신
      if (nextAIdx !== null) {
        const instrIdx = idxToInstr(nextAIdx);
        cache[3] = applyTransform(invertTransform, [
          renderInstructions[instrIdx],
          renderInstructions[instrIdx + 1]
        ]);
      } else {
        cache[3] = null;
      }
    }
    currentInstructionsIndex += verticesCount * instructionsPerVertex;
  }

  return {
    indicesBuffer: new Uint32Array([0, 1, 3, 1, 2, 3]),
    vertexAttributesBuffer: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
    instanceAttributesBuffer: instanceAttributes,
  };
}
