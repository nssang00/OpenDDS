#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform mat4 u_projectionMatrix;
uniform mat4 u_screenToWorldMatrix;
uniform vec2 u_viewportSizePx;
uniform float u_pixelRatio;
uniform float u_globalAlpha;
uniform float u_time;
uniform float u_zoom;
uniform float u_resolution;
uniform float u_rotation;
uniform vec4 u_renderExtent;
uniform vec2 u_patternOrigin;
uniform float u_depth;
uniform mediump int u_hitDetection;

const float PI = 3.141592653589793238;
const float TWO_PI = 2.0 * PI;
float currentLineMetric = 0.;

uniform vec2 u_texture1269122425_size;
uniform sampler2D u_texture1269122425;
uniform sampler2D u_depthMask;
uniform float u_tileZoomLevel;

// Removed unused attributes
// attribute vec2 a_segmentStart;
// attribute vec2 a_segmentEnd;
// attribute float a_measureStart;
// attribute float a_measureEnd;
// attribute float a_parameters;
// attribute float a_distance;
// attribute vec2 a_joinAngles;
// attribute vec4 a_hitColor;
// attribute float a_prop_layer;

varying vec2 v_segmentStart;
varying vec2 v_segmentEnd;
varying float v_angleStart;
varying float v_angleEnd;
varying float v_width;
varying vec4 v_hitColor;
varying float v_distanceOffsetPx;
varying float v_measureStart;
varying float v_measureEnd;
varying float v_prop_layer;

// New attributes provided from writelinesegmenttobuffers
attribute vec2 a_positionPx;  // The calculated positionPx
attribute vec2 a_joinDirection;  // The calculated joinDirection
attribute vec2 a_segmentStartPx;  // The calculated segmentStartPx
attribute vec2 a_segmentEndPx;  // The calculated segmentEndPx

vec2 worldToPx(vec2 worldPos) {
  vec4 screenPos = u_projectionMatrix * vec4(worldPos, 0.0, 1.0);
  return (0.5 * screenPos.xy + 0.5) * u_viewportSizePx;
}

vec4 pxToScreen(vec2 pxPos) {
  vec2 screenPos = 2.0 * pxPos / u_viewportSizePx - 1.0;
  return vec4(screenPos, u_depth, 1.0);
}

void main(void) {
  // Calculate values based on provided data
  v_segmentStart = a_segmentStartPx;
  v_segmentEnd = a_segmentEndPx;
  v_angleStart = 0.0;  // Set default or calculate if needed
  v_angleEnd = 0.0;    // Set default or calculate if needed

  v_width = 20.0;  // Set default or dynamically calculated line width
  v_hitColor = vec4(1.0, 1.0, 1.0, 1.0);  // Set default hit color
  v_distanceOffsetPx = 0.0;  // Set or calculate offset
  v_measureStart = 0.0;  // Set or calculate
  v_measureEnd = 0.0;    // Set or calculate
  v_prop_layer = 0.0;  // Set or calculate

  // Compute current vertex position
  vec2 positionPx = a_positionPx + a_joinDirection * (v_width * 0.5 + 1.0);  // Apply antialiasing offset
  gl_Position = pxToScreen(positionPx);
}

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
