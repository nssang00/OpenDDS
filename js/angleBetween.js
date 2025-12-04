function angleBetween(p0, pA, pB) {
  const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
  const bx = pB[0] - p0[0], by = pB[1] - p0[1];
  
  const lenA2 = ax * ax + ay * ay;
  const lenB2 = bx * bx + by * by;
  if (lenA2 < 1e-12 || lenB2 < 1e-12) return null;
  
  const dot = ax * bx + ay * by;
  const cross = ax * by - ay * bx;
  
  // cos 값을 직접 계산 (atan2 -> cos 중복 제거)
  const cosAngle = dot / Math.sqrt(lenA2 * lenB2);
  
  // 거의 직선인 경우 (cos > 0.985) 조기 반환
  if (cosAngle > 0.985) return null;
  
  // 필요한 경우만 각도 계산
  const angle = Math.atan2(cross, dot);
  return angle < 0 ? angle + 2 * Math.PI : angle;
}

let angle0 = -1, angle1 = -1;
let newAngleTangentSum = currentAngleTangentSum;

if (beforeIndex !== null) {
  angle0 = angleBetween(p0world, p1world, pBworld);
  if (angle0 !== null) {
    newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
  }
}

if (afterIndex !== null) {
  angle1 = angleBetween(p1world, p0world, pAworld);
  if (angle1 !== null) {
    newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
  }
}
