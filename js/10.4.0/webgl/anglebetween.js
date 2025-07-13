/**
 * Calculate the counter-clockwise angle (in radians, [0, 2π)) 
 * between vectors p0→pA and p0→pB.
 * - Zero-vector 보호
 * - atan2 기반: 빠르고, 부호 일관성, GLSL과 완벽 호환
 *
 * @param {[number, number]} p0 - 기준점
 * @param {[number, number]} pA - 벡터1 종점
 * @param {[number, number]} pB - 벡터2 종점
 * @returns {number} 0 ≤ angle < 2π
 */
function angleBetween(p0, pA, pB) {
  // 벡터 계산
  const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
  const bx = pB[0] - p0[0], by = pB[1] - p0[1];

  // 제로 벡터 방어 (동일점/길이 0)
  const aLen2 = ax * ax + ay * ay;
  const bLen2 = bx * bx + by * by;
  if (aLen2 < 1e-12 || bLen2 < 1e-12) return 0;

  // atan2(cross, dot)
  const dot   = ax * bx + ay * by;
  const cross = ax * by - ay * bx;
  let angle = Math.atan2(cross, dot);

  // [0, 2π)로 변환
  if (angle < 0) angle += 2 * Math.PI;
  return angle;
}
