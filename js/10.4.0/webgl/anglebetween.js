
function angleBetween(p0, pA, pB) {
  const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
  const bx = pB[0] - p0[0], by = pB[1] - p0[1];

  const aLen2 = ax * ax + ay * ay;
  const bLen2 = bx * bx + by * by;
  if (aLen2 < 1e-12 || bLen2 < 1e-12) return 0;

  const dot   = ax * bx + ay * by;
  const cross = ax * by - ay * bx;
  let angle = Math.atan2(cross, dot);

  if (angle < 0) angle += 2 * Math.PI;
  return angle;
}

function angleBetween2(p0, pA, pB) {
  const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
  const bx = pB[0] - p0[0], by = pB[1] - p0[1];

  const dot = ax * bx + ay * by;
  const cross = ax * by - ay * bx;

  if (Math.abs(dot) < 1e-12 && Math.abs(cross) < 1e-12) return 0;

  let angle = Math.atan2(cross, dot);
  return angle < 0 ? angle + 2 * Math.PI : angle;
}

function angleBetween_ori(p0, pA, pB) {
    const lenA = Math.sqrt(
      (pA[0] - p0[0]) * (pA[0] - p0[0]) + (pA[1] - p0[1]) * (pA[1] - p0[1]),
    );
    const tangentA = [(pA[0] - p0[0]) / lenA, (pA[1] - p0[1]) / lenA];
    const orthoA = [-tangentA[1], tangentA[0]];
    const lenB = Math.sqrt(
      (pB[0] - p0[0]) * (pB[0] - p0[0]) + (pB[1] - p0[1]) * (pB[1] - p0[1]),
    );
    const tangentB = [(pB[0] - p0[0]) / lenB, (pB[1] - p0[1]) / lenB];

    // this angle can be clockwise or anticlockwise; hence the computation afterwards
    const angle =
      lenA === 0 || lenB === 0
        ? 0
        : Math.acos(
            clamp(tangentB[0] * tangentA[0] + tangentB[1] * tangentA[1], -1, 1),
          );
    const isClockwise = tangentB[0] * orthoA[0] + tangentB[1] * orthoA[1] > 0;
    return !isClockwise ? Math.PI * 2 - angle : angle;
  }
