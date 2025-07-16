function generateLineStringBuffers_(renderInstructions, customAttributesSize, transform) {
  const customAttrsCount = customAttributesSize;
  const instructionsPerVertex = 3; // x, y, m

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

    // ---- 슬라이딩 윈도우 world 변환 ----
    let prevWorld = null;
    for (let i = 0; i < verticesCount - 1; i++) {
      // p0, p1
      const idx0 = currentInstructionsIndex + i * instructionsPerVertex;
      const idx1 = currentInstructionsIndex + (i + 1) * instructionsPerVertex;

      const p0 = [renderInstructions[idx0], renderInstructions[idx0 + 1]];
      const p1 = [renderInstructions[idx1], renderInstructions[idx1 + 1]];
      const m0 = renderInstructions[idx0 + 2];
      const m1 = renderInstructions[idx1 + 2];

      // world 변환, p0는 이전 루프의 p1world 재활용
      let p0world;
      if (i === 0) {
        p0world = applyTransform(invertTransform, p0);
      } else {
        p0world = prevWorld; // 이전 루프에서 계산된 p1world
      }
      const p1world = applyTransform(invertTransform, p1);

      // beforeWorld
      let beforeWorld = null;
      if (i > 0) {
        const idxB = currentInstructionsIndex + (i - 1) * instructionsPerVertex;
        beforeWorld = applyTransform(invertTransform, [
          renderInstructions[idxB], renderInstructions[idxB + 1]
        ]);
      } else if (isLoop) {
        const idxB = currentInstructionsIndex + (verticesCount - 2) * instructionsPerVertex;
        beforeWorld = applyTransform(invertTransform, [
          renderInstructions[idxB], renderInstructions[idxB + 1]
        ]);
      }

      // afterWorld
      let afterWorld = null;
      if (i < verticesCount - 2) {
        const idxA = currentInstructionsIndex + (i + 2) * instructionsPerVertex;
        afterWorld = applyTransform(invertTransform, [
          renderInstructions[idxA], renderInstructions[idxA + 1]
        ]);
      } else if (isLoop) {
        const idxA = currentInstructionsIndex + 1 * instructionsPerVertex;
        afterWorld = applyTransform(invertTransform, [
          renderInstructions[idxA], renderInstructions[idxA + 1]
        ]);
      }

      // 각도 함수 (동일)
      function angleBetween(p0, pA, pB) {
        const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
        const bx = pB[0] - p0[0], by = pB[1] - p0[1];
        if ((ax * ax + ay * ay) < 1e-12 || (bx * bx + by * by) < 1e-12) return 0;
        const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
        return angle < 0 ? angle + 2 * Math.PI : angle;
      }

      // 각도
      let angle0 = -1, angle1 = -1;
      let newAngleTangentSum = currentAngleTangentSum;
      if (beforeWorld) {
        angle0 = angleBetween(p0world, p1world, beforeWorld);
        if (Math.cos(angle0) <= 0.985) {
          newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
        }
      }
      if (afterWorld) {
        angle1 = angleBetween(p1world, p0world, afterWorld);
        if (Math.cos(angle1) <= 0.985) {
          newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
        }
      }

      // 버퍼 기록
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

      // 길이 누적
      currentLength += Math.sqrt(
        (p1world[0] - p0world[0]) * (p1world[0] - p0world[0]) +
        (p1world[1] - p0world[1]) * (p1world[1] - p0world[1])
      );
      currentAngleTangentSum = newAngleTangentSum;

      // 다음 루프를 위해 p1world를 prevWorld에 저장
      prevWorld = p1world;
    }
    currentInstructionsIndex += verticesCount * instructionsPerVertex;
  }

  return {
    indicesBuffer: new Uint32Array([0, 1, 3, 1, 2, 3]),
    vertexAttributesBuffer: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
    instanceAttributesBuffer: instanceAttributes,
  };
}
