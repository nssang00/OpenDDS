#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

// CPU에서 미리 계산된 클립 좌표와 고유 parameter만 전달됨
// (기존 p0, p1, join 각도, 오프셋 등의 계산은 CPU측에서 이루어짐)
attribute vec2 a_position;    // 미리 계산된 클립 공간 좌표 (x, y)
attribute float a_parameter;  // 정점별 고유 파라미터 (예: join 관련 정보)

// 만약 추가 custom attribute가 있다면 아래처럼 선언 가능 (예시)
// attribute vec3 a_customAttrib;

// 단순히 전역 alpha 값만 사용
uniform float u_globalAlpha;

// varyings 전달: 여기서는 parameter만 전달 (추가 custom attribute가 있다면 같이 전달)
varying float v_parameter;
// varying vec3 v_customAttrib; // 예시

void main(void) {
  // 이미 클립 공간 좌표이므로 단순히 할당
  gl_Position = vec4(a_position, 0.0, 1.0);
  
  // 정점별 유일 파라미터 전달 (이 값으로 fragment shader에서 stroke 패턴이나 색상 조절 가능)
  v_parameter = a_parameter;
  
  // 만약 추가 custom attribute가 있다면 그대로 전달
  // v_customAttrib = a_customAttrib;
}


// 헬퍼 함수들 (예시)
function worldToPx(worldPos, projectionMatrix, viewportSizePx) {
  // 실제 구현에서는 행렬 곱셈을 통해 world 좌표를 픽셀 좌표로 변환합니다.
  // 이 예제에서는 단순화하여 world 좌표를 그대로 반환합니다.
  return worldPos;
}

function pxToClip(pxPos, viewportSizePx) {
  // 픽셀 좌표를 클립 공간(-1 ~ 1) 좌표로 변환
  return [
    (pxPos[0] / viewportSizePx[0]) * 2 - 1,
    (pxPos[1] / viewportSizePx[1]) * 2 - 1,
  ];
}

function angleBetween(p0, pA, pB) {
  const dxA = pA[0] - p0[0], dyA = pA[1] - p0[1];
  const lenA = Math.sqrt(dxA * dxA + dyA * dyA);
  const tangentA = lenA === 0 ? [0, 0] : [dxA / lenA, dyA / lenA];
  const orthoA = [-tangentA[1], tangentA[0]];

  const dxB = pB[0] - p0[0], dyB = pB[1] - p0[1];
  const lenB = Math.sqrt(dxB * dxB + dyB * dyB);
  const tangentB = lenB === 0 ? [0, 0] : [dxB / lenB, dyB / lenB];

  const dot = tangentA[0] * tangentB[0] + tangentA[1] * tangentB[1];
  const angle = lenA === 0 || lenB === 0 ? 0 : Math.acos(Math.min(Math.max(dot, -1), 1));
  const isClockwise = (tangentB[0] * orthoA[0] + tangentB[1] * orthoA[1]) > 0;
  return isClockwise ? angle : 2 * Math.PI - angle;
}

// 각종 상수
const LINESTRING_ANGLE_COSINE_CUTOFF = Math.cos((10 * Math.PI) / 180); // 예: 10도 컷오프


export function writeLineSegmentToBuffersOptimized(
  instructions,
  segmentStartIndex,
  segmentEndIndex,
  beforeSegmentIndex,
  afterSegmentIndex,
  vertexArray,
  indexArray,
  customAttributes,
  toWorldTransform,
  projectionMatrix,
  viewportSizePx,
  currentLength,
  currentAngleTangentSum
) {
  // p0, p1 및 m0, m1 계산 (각 좌표는 [x, y] 형태)
  const p0 = [instructions[segmentStartIndex], instructions[segmentStartIndex + 1]];
  const p1 = [instructions[segmentEndIndex], instructions[segmentEndIndex + 1]];
  const m0 = instructions[segmentStartIndex + 2];
  const m1 = instructions[segmentEndIndex + 2];

  // 월드 좌표로 변환
  const p0world = applyTransform(toWorldTransform, p0.slice());
  const p1world = applyTransform(toWorldTransform, p1.slice());

  // join 각도 계산 (없으면 -1로 설정)
  let angle0 = -1;
  let angle1 = -1;
  let newAngleTangentSum = currentAngleTangentSum;
  const joinBefore = beforeSegmentIndex !== null;
  const joinAfter = afterSegmentIndex !== null;

  if (joinBefore) {
    const pB = [instructions[beforeSegmentIndex], instructions[beforeSegmentIndex + 1]];
    const pBworld = applyTransform(toWorldTransform, pB.slice());
    angle0 = angleBetween(p0world, p1world, pBworld);
    if (Math.cos(angle0) <= LINESTRING_ANGLE_COSINE_CUTOFF) {
      newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
    }
  }
  if (joinAfter) {
    const pA = [instructions[afterSegmentIndex], instructions[afterSegmentIndex + 1]];
    const pAworld = applyTransform(toWorldTransform, pA.slice());
    angle1 = angleBetween(p1world, p0world, pAworld);
    if (Math.cos(angle1) <= LINESTRING_ANGLE_COSINE_CUTOFF) {
      newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
    }
  }

  // 월드 좌표를 픽셀 좌표로 변환 (CPU용 worldToPx 함수 사용)
  const segmentStartPx = worldToPx(p0world, projectionMatrix, viewportSizePx);
  const segmentEndPx = worldToPx(p1world, projectionMatrix, viewportSizePx);

  // 선분 방향(터전트)와 노말 계산 (픽셀 단위)
  const dx = segmentEndPx[0] - segmentStartPx[0];
  const dy = segmentEndPx[1] - segmentStartPx[1];
  const segLength = Math.sqrt(dx * dx + dy * dy);
  const tangentPx = [dx / segLength, dy / segLength];
  const normalPx = [-tangentPx[1], tangentPx[0]];

  // 라인 폭 및 오프셋 (antialias용 1px 추가)
  const lineWidth = 20.0;
  const offset = lineWidth * 0.5 + 1.0;

  // 각 정점의 최종 위치(픽셀 단위)를 계산하는 함수
  function computeVertexPosition(vertexIndex, angle0, angle1) {
    // vertexIndex: 0, 1은 시작점, 2, 3은 끝점 사용
    const basePos = vertexIndex < 2 ? segmentStartPx : segmentEndPx;
    const angle = vertexIndex < 2 ? angle0 : angle1;
    // 정점 순서에 따른 방향 결정: 0,3는 normalDir = +1, 1,2는 -1; 시작/끝에 따른 tangentDir 적용
    const normalDir = (vertexIndex === 0 || vertexIndex === 3) ? 1 : -1;
    const tangentDir = vertexIndex < 2 ? 1 : -1;
    let joinDirection;
    // 각도가 거의 0에 가깝거나 cap인 경우, 단순히 노말과 터전트의 조합 사용
    if (Math.cos(angle) > 0.985 || angle < -0.1) {
      joinDirection = [
        normalPx[0] * normalDir - tangentPx[0] * tangentDir,
        normalPx[1] * normalDir - tangentPx[1] * tangentDir,
      ];
    } else {
      // 적당한 join 계산: 각도의 절반을 사용해 bisector 방향 계산
      const halfAngle = angle / 2;
      const c = Math.cos(halfAngle);
      const s = Math.sin(halfAngle);
      const angleBisectorNormal = [
        s * normalPx[0] + c * normalPx[1],
        -c * normalPx[0] + s * normalPx[1],
      ];
      joinDirection = [angleBisectorNormal[0] / s, angleBisectorNormal[1] / s];
    }
    return [
      basePos[0] + joinDirection[0] * offset,
      basePos[1] + joinDirection[1] * offset,
    ];
  }

  // 4개 정점의 최종 위치(픽셀 좌표) 계산 후 클립 좌표로 변환 (pxToClip 함수 사용)
  const pos0 = computeVertexPosition(0, angle0, angle1);
  const pos1 = computeVertexPosition(1, angle0, angle1);
  const pos2 = computeVertexPosition(2, angle0, angle1);
  const pos3 = computeVertexPosition(3, angle0, angle1);
  const clip0 = pxToClip(pos0, viewportSizePx);
  const clip1 = pxToClip(pos1, viewportSizePx);
  const clip2 = pxToClip(pos2, viewportSizePx);
  const clip3 = pxToClip(pos3, viewportSizePx);

  // 각 정점마다 유일하게 적용되는 parameter 계산
  function computeParameters(vertexIndex, angleSum) {
    if (angleSum === 0) {
      return vertexIndex * 10000;
    }
    return Math.sign(angleSum) * (vertexIndex * 10000 + Math.abs(angleSum));
  }
  const param0 = computeParameters(0, currentAngleTangentSum);
  const param1 = computeParameters(1, currentAngleTangentSum);
  const param2 = computeParameters(2, currentAngleTangentSum);
  const param3 = computeParameters(3, currentAngleTangentSum);

  // 각 정점에는 미리 계산된 클립 좌표(2), parameter(1), 그리고 customAttributes가 포함됩니다.
  const stride = 3 + customAttributes.length;
  const baseIndex = vertexArray.length / stride;

  vertexArray.push(clip0[0], clip0[1], param0, ...customAttributes);
  vertexArray.push(clip1[0], clip1[1], param1, ...customAttributes);
  vertexArray.push(clip2[0], clip2[1], param2, ...customAttributes);
  vertexArray.push(clip3[0], clip3[1], param3, ...customAttributes);

  // 두 삼각형으로 인덱스 버퍼 구성
  indexArray.push(
    baseIndex, baseIndex + 1, baseIndex + 2,
    baseIndex + 1, baseIndex + 3, baseIndex + 2
  );

  // 누적 길이 업데이트 (현재 세그먼트의 길이 추가)
  const newLength = currentLength + segLength;
  return { length: newLength, angle: newAngleTangentSum };
}
