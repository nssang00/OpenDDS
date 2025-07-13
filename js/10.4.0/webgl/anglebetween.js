
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

export function optimizedAngleBetween(p0, pA, pB) {
  const dx1 = pA[0] - p0[0], dy1 = pA[1] - p0[1];
  const dx2 = pB[0] - p0[0], dy2 = pB[1] - p0[1];
  
  const dot = dx1*dx2 + dy1*dy2;
  const cross = dx1*dy2 - dy1*dx2;
  const magSq1 = dx1*dx1 + dy1*dy1;
  const magSq2 = dx2*dx2 + dy2*dy2;
  
  if (magSq1 === 0 || magSq2 === 0) return 0;
  
  if (dot * dot > 0.998 * magSq1 * magSq2) {
    return cross >= 0 ? 0 : 2 * Math.PI;
  }
  
  const angle = Math.atan2(cross, dot); 
  return angle >= 0 ? angle : angle + 2 * Math.PI;
}
