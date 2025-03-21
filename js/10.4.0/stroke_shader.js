//vertex
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
float currentLineMetric = 0.; // an actual value will be used in the stroke shaders

uniform sampler2D u_depthMask;
uniform float u_tileZoomLevel;
attribute vec2 a_segmentStart;
attribute vec2 a_segmentEnd;
attribute float a_measureStart;
attribute float a_measureEnd;
attribute float a_parameters;
attribute float a_distance;
attribute vec2 a_joinAngles;
attribute vec4 a_hitColor;
attribute float a_prop_class;
attribute float a_prop_layer;
varying vec2 v_segmentStart;
varying vec2 v_segmentEnd;
varying float v_angleStart;
varying float v_angleEnd;
varying float v_width;
varying vec4 v_hitColor;
varying float v_distanceOffsetPx;
varying float v_measureStart;
varying float v_measureEnd;
varying float v_prop_class;
varying float v_prop_layer;

vec2 worldToPx(vec2 worldPos) {
  vec4 screenPos = u_projectionMatrix * vec4(worldPos, 0.0, 1.0);
  return (0.5 * screenPos.xy + 0.5) * u_viewportSizePx;
}

vec4 pxToScreen(vec2 pxPos) {
  vec2 screenPos = 2.0 * pxPos / u_viewportSizePx - 1.0;
  return vec4(screenPos, u_depth, 1.0);
}

bool isCap(float joinAngle) {
  return joinAngle < -0.1;
}

vec2 getJoinOffsetDirection(vec2 normalPx, float joinAngle) {
  float halfAngle = joinAngle / 2.0;
  float c = cos(halfAngle);
  float s = sin(halfAngle);
  vec2 angleBisectorNormal = vec2(s * normalPx.x + c * normalPx.y, -c * normalPx.x + s * normalPx.y);
  float length = 1.0 / s;
  return angleBisectorNormal * length;
}

vec2 getOffsetPoint(vec2 point, vec2 normal, float joinAngle, float offsetPx) {
  // if on a cap or the join angle is too high, offset the line along the segment normal
  if (cos(joinAngle) > 0.998 || isCap(joinAngle)) {
    return point - normal * offsetPx;
  }
  // offset is applied along the inverted normal (positive offset goes "right" relative to line direction)
  return point - getJoinOffsetDirection(normal, joinAngle) * offsetPx;
}

void main(void) {
  v_angleStart = a_joinAngles.x;
  v_angleEnd = a_joinAngles.y;
  float vertexNumber = floor(abs(a_parameters) / 10000. + 0.5);
  currentLineMetric = vertexNumber < 1.5 ? a_measureStart : a_measureEnd;
  // we're reading the fractional part while keeping the sign (so -4.12 gives -0.12, 3.45 gives 0.45)
  float angleTangentSum = fract(abs(a_parameters) / 10000.) * 10000. * sign(a_parameters);

  float lineWidth = 2.0;
  float lineOffsetPx = 0.;

  // compute segment start/end in px with offset
  vec2 segmentStartPx = worldToPx(a_segmentStart);
  vec2 segmentEndPx = worldToPx(a_segmentEnd);
  vec2 tangentPx = normalize(segmentEndPx - segmentStartPx);
  vec2 normalPx = vec2(-tangentPx.y, tangentPx.x);
  segmentStartPx = getOffsetPoint(segmentStartPx, normalPx, v_angleStart, lineOffsetPx),
  segmentEndPx = getOffsetPoint(segmentEndPx, normalPx, v_angleEnd, lineOffsetPx);
  
  // compute current vertex position
  float normalDir = vertexNumber < 0.5 || (vertexNumber > 1.5 && vertexNumber < 2.5) ? 1.0 : -1.0;
  float tangentDir = vertexNumber < 1.5 ? 1.0 : -1.0;
  float angle = vertexNumber < 1.5 ? v_angleStart : v_angleEnd;
  vec2 joinDirection;
  vec2 positionPx = vertexNumber < 1.5 ? segmentStartPx : segmentEndPx;
  // if angle is too high, do not make a proper join
  if (cos(angle) > 0.985 || isCap(angle)) {
    joinDirection = normalPx * normalDir - tangentPx * tangentDir;
  } else {
    joinDirection = getJoinOffsetDirection(normalPx * normalDir, angle);
  }
  positionPx = positionPx + joinDirection * (lineWidth * 0.5 + 1.); // adding 1 pixel for antialiasing
  gl_Position = pxToScreen(positionPx);

  v_segmentStart = segmentStartPx;
  v_segmentEnd = segmentEndPx;
  v_width = lineWidth;
  v_hitColor = a_hitColor;
  v_distanceOffsetPx = a_distance / u_resolution - (lineOffsetPx * angleTangentSum);
  v_measureStart = a_measureStart;
  v_measureEnd = a_measureEnd;
  v_prop_class = a_prop_class;
  v_prop_layer = a_prop_layer;
} 
//fragment
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
float currentLineMetric = 0.; // an actual value will be used in the stroke shaders

uniform sampler2D u_depthMask;
uniform float u_tileZoomLevel;
varying vec2 v_segmentStart;
varying vec2 v_segmentEnd;
varying float v_angleStart;
varying float v_angleEnd;
varying float v_width;
varying vec4 v_hitColor;
varying float v_distanceOffsetPx;
varying float v_measureStart;
varying float v_measureEnd;
varying float v_prop_class;
varying float v_prop_layer;
bool operator_in_0(float inputValue) {
  if (inputValue == 1.0) { return true; }
  if (inputValue == 2.0) { return true; }
  return false;
}

vec2 pxToWorld(vec2 pxPos) {
  vec2 screenPos = 2.0 * pxPos / u_viewportSizePx - 1.0;
  return (u_screenToWorldMatrix * vec4(screenPos, 0.0, 1.0)).xy;
}

bool isCap(float joinAngle) {
  return joinAngle < -0.1;
}

float segmentDistanceField(vec2 point, vec2 start, vec2 end, float width) {
  vec2 tangent = normalize(end - start);
  vec2 normal = vec2(-tangent.y, tangent.x);
  vec2 startToPoint = point - start;
  return abs(dot(startToPoint, normal)) - width * 0.5;
}

float buttCapDistanceField(vec2 point, vec2 start, vec2 end) {
  vec2 startToPoint = point - start;
  vec2 tangent = normalize(end - start);
  return dot(startToPoint, -tangent);
}

float squareCapDistanceField(vec2 point, vec2 start, vec2 end, float width) {
  return buttCapDistanceField(point, start, end) - width * 0.5;
}

float roundCapDistanceField(vec2 point, vec2 start, vec2 end, float width) {
  float onSegment = max(0., 1000. * dot(point - start, end - start)); // this is very high when inside the segment
  return length(point - start) - width * 0.5 - onSegment;
}

float roundJoinDistanceField(vec2 point, vec2 start, vec2 end, float width) {
  return roundCapDistanceField(point, start, end, width);
}

float bevelJoinField(vec2 point, vec2 start, vec2 end, float width, float joinAngle) {
  vec2 startToPoint = point - start;
  vec2 tangent = normalize(end - start);
  float c = cos(joinAngle * 0.5);
  float s = sin(joinAngle * 0.5);
  float direction = -sign(sin(joinAngle));
  vec2 bisector = vec2(c * tangent.x - s * tangent.y, s * tangent.x + c * tangent.y);
  float radius = width * 0.5 * s;
  return dot(startToPoint, bisector * direction) - radius;
}

float miterJoinDistanceField(vec2 point, vec2 start, vec2 end, float width, float joinAngle) {
  if (cos(joinAngle) > 0.985) { // avoid risking a division by zero
    return bevelJoinField(point, start, end, width, joinAngle);
  }
  float miterLength = 1. / sin(joinAngle * 0.5);
  float miterLimit = 10.;
  if (miterLength > miterLimit) {
    return bevelJoinField(point, start, end, width, joinAngle);
  }
  return -1000.;
}

float capDistanceField(vec2 point, vec2 start, vec2 end, float width, float capType) {
   if (capType == 4.0) {
    return buttCapDistanceField(point, start, end);
  } else if (capType == 5.0) {
    return squareCapDistanceField(point, start, end, width);
  }
  return roundCapDistanceField(point, start, end, width);
}

float joinDistanceField(vec2 point, vec2 start, vec2 end, float width, float joinAngle, float joinType) {
  if (joinType == 6.0) {
    return bevelJoinField(point, start, end, width, joinAngle);
  } else if (joinType == 7.0) {
    return miterJoinDistanceField(point, start, end, width, joinAngle);
  }
  return roundJoinDistanceField(point, start, end, width);
}

float computeSegmentPointDistance(vec2 point, vec2 start, vec2 end, float width, float joinAngle, float capType, float joinType) {
  if (isCap(joinAngle)) {
    return capDistanceField(point, start, end, width, capType);
  }
  return joinDistanceField(point, start, end, width, joinAngle, joinType);
}

void main(void) {
  vec2 currentPoint = gl_FragCoord.xy / u_pixelRatio;
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  vec2 worldPos = pxToWorld(currentPoint);
  if (
    abs(u_renderExtent[0] - u_renderExtent[2]) > 0.0 && (
      worldPos[0] < u_renderExtent[0] ||
      worldPos[1] < u_renderExtent[1] ||
      worldPos[0] > u_renderExtent[2] ||
      worldPos[1] > u_renderExtent[3]
    )
  ) {
    discard;
  }
  #endif

  float segmentLength = length(v_segmentEnd - v_segmentStart);
  vec2 segmentTangent = (v_segmentEnd - v_segmentStart) / segmentLength;
  vec2 segmentNormal = vec2(-segmentTangent.y, segmentTangent.x);
  vec2 startToPoint = currentPoint - v_segmentStart;
  float lengthToPoint = max(0., min(dot(segmentTangent, startToPoint), segmentLength));
  float currentLengthPx = lengthToPoint + v_distanceOffsetPx; 
  float currentRadiusPx = abs(dot(segmentNormal, startToPoint));
  float currentRadiusRatio = dot(segmentNormal, startToPoint) * 2. / v_width;
  currentLineMetric = mix(v_measureStart, v_measureEnd, lengthToPoint / segmentLength);

  if ((!((u_resolution < 600.0) && operator_in_0(v_prop_class) && (v_prop_layer == 3.0))) || (texture2D(u_depthMask, gl_FragCoord.xy / u_pixelRatio / u_viewportSizePx).r * 50. > u_tileZoomLevel + 0.5)) { discard; }

  vec4 color = vec4(1.0, 0.0, 0.0, 1.0);
  float capType = 0.0;
  float joinType = 0.0;
  float segmentStartDistance = computeSegmentPointDistance(currentPoint, v_segmentStart, v_segmentEnd, v_width, v_angleStart, capType, joinType);
  float segmentEndDistance = computeSegmentPointDistance(currentPoint, v_segmentEnd, v_segmentStart, v_width, v_angleEnd, capType, joinType);
  float distance = max(
    segmentDistanceField(currentPoint, v_segmentStart, v_segmentEnd, v_width),
    max(segmentStartDistance, segmentEndDistance)
  );
  distance = max(distance, -1000.);
  color.a *= smoothstep(0.5, -0.5, distance);
  gl_FragColor = color;
  gl_FragColor.a *= u_globalAlpha;
  gl_FragColor.rgb *= gl_FragColor.a;
  if (u_hitDetection > 0) {
    if (gl_FragColor.a < 0.1) { discard; };
    gl_FragColor = v_hitColor;
  }
}

/**
 * Pushes a single quad to form a line segment; also includes a computation for the join angles with previous and next
 * segment, in order to be able to offset the vertices correctly in the shader.
 * Join angles are between 0 and 2PI.
 * This also computes the length of the current segment and the sum of the join angle tangents in order
 * to store this information on each subsequent segment along the line. This is necessary to correctly render dashes
 * and symbols along the line.
 *
 *   pB (before)                          pA (after)
 *    X             negative             X
 *     \             offset             /
 *      \                              /
 *       \   join              join   /
 *        \ angle 0          angle 1 /
 *         \←---                ←---/      positive
 *          \   ←--          ←--   /        offset
 *           \     ↑       ↓      /
 *            X────┴───────┴─────X
 *            p0                  p1
 *
 * @param {Float32Array} instructions Array of render instructions for lines.s
 * @param {number} segmentStartIndex Index of the segment start point from which render instructions will be read.
 * @param {number} segmentEndIndex Index of the segment end point from which render instructions will be read.
 * @param {number|null} beforeSegmentIndex Index of the point right before the segment (null if none, e.g this is a line start)
 * @param {number|null} afterSegmentIndex Index of the point right after the segment (null if none, e.g this is a line end)
 * @param {Array<number>} vertexArray Array containing vertices.
 * @param {Array<number>} indexArray Array containing indices.
 * @param {Array<number>} customAttributes Array of custom attributes value
 * @param {import('../../transform.js').Transform} toWorldTransform Transform matrix used to obtain world coordinates from instructions
 * @param {number} currentLength Cumulated length of segments processed so far
 * @param {number} currentAngleTangentSum Cumulated tangents of the join angles processed so far
 * @return {{length: number, angle: number}} Cumulated length with the newly processed segment (in world units), new sum of the join angle tangents
 * @private
 */
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
  // compute the stride to determine how many vertices were already pushed
  const baseVertexAttrsCount = 10; // base attributes: x0, y0, m0, x1, y1, m1, angle0, angle1, distance, params
  const stride = baseVertexAttrsCount + customAttributes.length;
  const baseIndex = vertexArray.length / stride;

  // The segment is composed of two positions called P0[x0, y0] and P1[x1, y1]
  // Depending on whether there are points before and after the segment, its final shape
  // will be different
  const p0 = [
    instructions[segmentStartIndex + 0],
    instructions[segmentStartIndex + 1],
  ];
  const p1 = [instructions[segmentEndIndex], instructions[segmentEndIndex + 1]];

  const m0 = instructions[segmentStartIndex + 2];
  const m1 = instructions[segmentEndIndex + 2];

  // to compute join angles we need to reproject coordinates back in world units
  const p0world = applyTransform(toWorldTransform, [...p0]);
  const p1world = applyTransform(toWorldTransform, [...p1]);

  /**
   * Compute the angle between p0pA and p0pB
   * @param {import("../../coordinate.js").Coordinate} p0 Point 0
   * @param {import("../../coordinate.js").Coordinate} pA Point A
   * @param {import("../../coordinate.js").Coordinate} pB Point B
   * @return {number} a value in [0, 2PI]
   */
  function angleBetween(p0, pA, pB) {
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

  // a negative angle indicates a line cap
  let angle0 = -1;
  let angle1 = -1;
  let newAngleTangentSum = currentAngleTangentSum;

  const joinBefore = beforeSegmentIndex !== null;
  const joinAfter = afterSegmentIndex !== null;

  // add vertices and adapt offsets for P0 in case of join
  if (joinBefore) {
    // B for before
    const pB = [
      instructions[beforeSegmentIndex],
      instructions[beforeSegmentIndex + 1],
    ];
    const pBworld = applyTransform(toWorldTransform, [...pB]);
    angle0 = angleBetween(p0world, p1world, pBworld);

    // only add to the sum if the angle isn't too close to 0 or 2PI
    if (Math.cos(angle0) <= LINESTRING_ANGLE_COSINE_CUTOFF) {
      newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
    }
  }
  // adapt offsets for P1 in case of join; add to angle sum
  if (joinAfter) {
    // A for after
    const pA = [
      instructions[afterSegmentIndex],
      instructions[afterSegmentIndex + 1],
    ];
    const pAworld = applyTransform(toWorldTransform, [...pA]);
    angle1 = angleBetween(p1world, p0world, pAworld);

    // only add to the sum if the angle isn't too close to 0 or 2PI
    if (Math.cos(angle1) <= LINESTRING_ANGLE_COSINE_CUTOFF) {
      newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
    }
  }

  /**
   * @param {number} vertexIndex From 0 to 3, indicating position in the quad
   * @param {number} angleSum Sum of the join angles encountered so far (used to compute distance offset
   * @return {number} A float value containing both information
   */
  function computeParameters(vertexIndex, angleSum) {
    if (angleSum === 0) {
      return vertexIndex * 10000;
    }
    return Math.sign(angleSum) * (vertexIndex * 10000 + Math.abs(angleSum));
  }

  // add main segment triangles
  vertexArray.push(
    p0[0],
    p0[1],
    m0,
    p1[0],
    p1[1],
    m1,
    angle0,
    angle1,
    currentLength,
    computeParameters(0, currentAngleTangentSum),
  );
  vertexArray.push(...customAttributes);

  vertexArray.push(
    p0[0],
    p0[1],
    m0,
    p1[0],
    p1[1],
    m1,
    angle0,
    angle1,
    currentLength,
    computeParameters(1, currentAngleTangentSum),
  );
  vertexArray.push(...customAttributes);

  vertexArray.push(
    p0[0],
    p0[1],
    m0,
    p1[0],
    p1[1],
    m1,
    angle0,
    angle1,
    currentLength,
    computeParameters(2, currentAngleTangentSum),
  );
  vertexArray.push(...customAttributes);

  vertexArray.push(
    p0[0],
    p0[1],
    m0,
    p1[0],
    p1[1],
    m1,
    angle0,
    angle1,
    currentLength,
    computeParameters(3, currentAngleTangentSum),
  );
  vertexArray.push(...customAttributes);

  indexArray.push(
    baseIndex,
    baseIndex + 1,
    baseIndex + 2,
    baseIndex + 1,
    baseIndex + 3,
    baseIndex + 2,
  );

  return {
    length:
      currentLength +
      Math.sqrt(
        (p1world[0] - p0world[0]) * (p1world[0] - p0world[0]) +
          (p1world[1] - p0world[1]) * (p1world[1] - p0world[1]),
      ),
    angle: newAngleTangentSum,
  };
}

worker.onmessage = (event) => {
  const received = event.data;
  switch (received.type) {
    case WebGLWorkerMessageType.GENERATE_LINE_STRING_BUFFERS: {
      /** @type {Array<number>} */
      const vertices = [];
      /** @type {Array<number>} */
      const indices = [];

      const customAttrsCount = received.customAttributesSize;
      const instructionsPerVertex = 3;

      const renderInstructions = new Float32Array(received.renderInstructions);
      let currentInstructionsIndex = 0;

      const transform = received.renderInstructionsTransform;
      const invertTransform = createTransform();
      makeInverseTransform(invertTransform, transform);

      let verticesCount, customAttributes;
      while (currentInstructionsIndex < renderInstructions.length) {
        customAttributes = Array.from(
          renderInstructions.slice(
            currentInstructionsIndex,
            currentInstructionsIndex + customAttrsCount,
          ),
        );
        currentInstructionsIndex += customAttrsCount;
        verticesCount = renderInstructions[currentInstructionsIndex++];

        const firstInstructionsIndex = currentInstructionsIndex;
        const lastInstructionsIndex =
          currentInstructionsIndex +
          (verticesCount - 1) * instructionsPerVertex;
        const isLoop =
          renderInstructions[firstInstructionsIndex] ===
            renderInstructions[lastInstructionsIndex] &&
          renderInstructions[firstInstructionsIndex + 1] ===
            renderInstructions[lastInstructionsIndex + 1];

        let currentLength = 0;
        let currentAngleTangentSum = 0;

        // last point is only a segment end, do not loop over it
        for (let i = 0; i < verticesCount - 1; i++) {
          let beforeIndex = null;
          if (i > 0) {
            beforeIndex =
              currentInstructionsIndex + (i - 1) * instructionsPerVertex;
          } else if (isLoop) {
            beforeIndex = lastInstructionsIndex - instructionsPerVertex;
          }
          let afterIndex = null;
          if (i < verticesCount - 2) {
            afterIndex =
              currentInstructionsIndex + (i + 2) * instructionsPerVertex;
          } else if (isLoop) {
            afterIndex = firstInstructionsIndex + instructionsPerVertex;
          }
          const measures = writeLineSegmentToBuffers(
            renderInstructions,
            currentInstructionsIndex + i * instructionsPerVertex,
            currentInstructionsIndex + (i + 1) * instructionsPerVertex,
            beforeIndex,
            afterIndex,
            vertices,
            indices,
            customAttributes,
            invertTransform,
            currentLength,
            currentAngleTangentSum,
          );
          currentLength = measures.length;
          currentAngleTangentSum = measures.angle;
        }
        currentInstructionsIndex += verticesCount * instructionsPerVertex;
      }

      const indexBuffer = Uint32Array.from(indices);
      const vertexBuffer = Float32Array.from(vertices);

      /** @type {import('../render/webgl/constants.js').WebGLWorkerGenerateBuffersMessage} */
      const message = Object.assign(
        {
          vertexBuffer: vertexBuffer.buffer,
          indexBuffer: indexBuffer.buffer,
          renderInstructions: renderInstructions.buffer,
        },
        received,
      );

      worker.postMessage(message, [
        vertexBuffer.buffer,
        indexBuffer.buffer,
        renderInstructions.buffer,
      ]);
      break;
    }
