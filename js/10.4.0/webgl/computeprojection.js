function computeProjectionMatrix(center, resolution, rotation, viewportWidth, viewportHeight) {
  // center: [x, y] (월드 좌표계 중심)
  // resolution: 월드좌표 1단위가 화면상 몇 픽셀인가 (ex: 256/tile at zoom 0 이면 해상도=156543.0339)
  // rotation: 라디안 (시계반대가 +)
  // viewportWidth, viewportHeight: 픽셀단위 화면 크기

  const halfWidth = (viewportWidth * resolution) / 2;
  const halfHeight = (viewportHeight * resolution) / 2;

  // 1. pan(중심점 기준 상대좌표)
  // 2. zoom/scale
  // 3. rotate
  // 4. NDC 변환

  // (OpenLayers 내부와 거의 동일한 매트릭스 구성)
  const cos = Math.cos(-rotation); // 시계방향이 +라면 -rotation
  const sin = Math.sin(-rotation);

  // 4x4 행렬 (column-major)
  const m = new Float32Array(16);

  // scale+rotation
  m[0] =  cos / halfWidth;
  m[1] =  sin / halfWidth;
  m[2] =  0;
  m[3] =  0;

  m[4] = -sin / halfHeight;
  m[5] =  cos / halfHeight;
  m[6] =  0;
  m[7] =  0;

  m[8] = 0;
  m[9] = 0;
  m[10] = 1;
  m[11] = 0;

  // translation (중심을 화면 중앙에 맞춤)
  m[12] = -(cos * center[0] - sin * center[1]) / halfWidth;
  m[13] = -(-sin * center[0] - cos * center[1]) / halfHeight;
  m[14] = 0;
  m[15] = 1;

  return m;
}
const center = [x, y];         // 지도 중심 월드좌표
const resolution = ...;        // 해상도(zoom)
const rotation = ...;          // 라디안
const width = canvas.width;    // 뷰포트 가로
const height = canvas.height;  // 뷰포트 세로

const u_projectionMatrix = computeProjectionMatrix(center, resolution, rotation, width, height);
gl.uniformMatrix4fv(u_projMatLocation, false, u_projectionMatrix);
