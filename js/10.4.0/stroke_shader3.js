export function writeLineSegmentToBuffers(
  instructions,
  segmentStartIndex,
  segmentEndIndex,
  beforeSegmentIndex,
  afterSegmentIndex,
  vertexArray,
  indexArray,
  customAttributes,
  toWorldTransform,
  currentLength,
  currentAngleTangentSum,
) {
  const stride = 9 + customAttributes.length; // positionPx(2) + hitColor(4) + distanceOffsetPx(1) + measure(2) + layer(1)
  const baseIndex = vertexArray.length / stride;

  const p0 = [instructions[segmentStartIndex], instructions[segmentStartIndex + 1]];
  const p1 = [instructions[segmentEndIndex], instructions[segmentEndIndex + 1]];
  const m0 = instructions[segmentStartIndex + 2];
  const m1 = instructions[segmentEndIndex + 2];

  const p0world = applyTransform(toWorldTransform, [...p0]);
  const p1world = applyTransform(toWorldTransform, [...p1]);

  function angleBetween(p0, pA, pB) {
    const lenA = Math.hypot(pA[0] - p0[0], pA[1] - p0[1]);
    const tangentA = [(pA[0] - p0[0]) / lenA, (pA[1] - p0[1]) / lenA];
    const orthoA = [-tangentA[1], tangentA[0]];
    const lenB = Math.hypot(pB[0] - p0[0], pB[1] - p0[1]);
    const tangentB = [(pB[0] - p0[0]) / lenB, (pB[1] - p0[1]) / lenB];

    const angle =
      lenA === 0 || lenB === 0
        ? 0
        : Math.acos(clamp(tangentB[0] * tangentA[0] + tangentB[1] * tangentA[1], -1, 1));
    const isClockwise = tangentB[0] * orthoA[0] + tangentB[1] * orthoA[1] > 0;
    return !isClockwise ? Math.PI * 2 - angle : angle;
  }

  let angle0 = -1, angle1 = -1, newAngleTangentSum = currentAngleTangentSum;
  const joinBefore = beforeSegmentIndex !== null;
  const joinAfter = afterSegmentIndex !== null;

  if (joinBefore) {
    const pB = [instructions[beforeSegmentIndex], instructions[beforeSegmentIndex + 1]];
    const pBworld = applyTransform(toWorldTransform, [...pB]);
    angle0 = angleBetween(p0world, p1world, pBworld);
    if (Math.cos(angle0) <= LINESTRING_ANGLE_COSINE_CUTOFF) {
      newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
    }
  }

  if (joinAfter) {
    const pA = [instructions[afterSegmentIndex], instructions[afterSegmentIndex + 1]];
    const pAworld = applyTransform(toWorldTransform, [...pA]);
    angle1 = angleBetween(p1world, p0world, pAworld);
    if (Math.cos(angle1) <= LINESTRING_ANGLE_COSINE_CUTOFF) {
      newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
    }
  }

  const segmentStartPx = worldToPx(p0world);
  const segmentEndPx = worldToPx(p1world);
  const tangentPx = normalize([segmentEndPx[0] - segmentStartPx[0], segmentEndPx[1] - segmentStartPx[1]]);
  const normalPx = [-tangentPx[1], tangentPx[0]];
  const lineWidth = 20.0;
  const lineOffsetPx = 0.0;

  function getOffsetPoint(point, normal, joinAngle, offsetPx) {
    return point - getJoinOffsetDirection(normal, joinAngle) * offsetPx;
  }

  function computeVertexPosition(vertexNumber, segmentStartPx, segmentEndPx, normalPx, tangentPx, angleStart, angleEnd) {
    const normalDir = vertexNumber < 0.5 || (vertexNumber > 1.5 && vertexNumber < 2.5) ? 1.0 : -1.0;
    const tangentDir = vertexNumber < 1.5 ? 1.0 : -1.0;
    const angle = vertexNumber < 1.5 ? angleStart : angleEnd;
    const positionPx = vertexNumber < 1.5 ? segmentStartPx : segmentEndPx;
    const joinDirection = getJoinOffsetDirection(normalPx * normalDir, angle);
    return [
      positionPx[0] + joinDirection[0] * (lineWidth * 0.5 + 1.0),
      positionPx[1] + joinDirection[1] * (lineWidth * 0.5 + 1.0),
    ];
  }

  const hitColor = [1.0, 0.0, 0.0, 1.0]; // 예제 색상, 필요에 따라 변경

  for (let i = 0; i < 4; i++) {
    const vertexPosition = computeVertexPosition(i, segmentStartPx, segmentEndPx, normalPx, tangentPx, angle0, angle1);
    vertexArray.push(...vertexPosition, ...hitColor, currentLength, m0, m1, 1.0, ...customAttributes);
  }

  indexArray.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex + 1, baseIndex + 3, baseIndex + 2);

  return {
    length: currentLength + Math.hypot(p1world[0] - p0world[0], p1world[1] - p0world[1]),
    angle: newAngleTangentSum,
  };
}
