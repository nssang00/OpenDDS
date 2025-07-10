composeTransform(
  projectionMatrix,
  ...,         // 나머지는 기존대로
  -origin.x,   // translate X, 반드시 음수!
  -origin.y    // translate Y, 반드시 음수!
);

const origin =  getViewCenter(); // EPSG:3857 큰 값 (ex: [1.5e8, 4.2e7])
vertexArray.push(feature.x - origin[0]);
vertexArray.push(feature.y - origin[1]);

uniform vec2 u_viewOrigin;
attribute vec2 a_position; // 이미 origin 뺀 값

void main() {
    gl_Position = u_projectMatrix * vec4(a_position, 0, 1);

    vec2 worldPos = a_position + u_viewOrigin; // "더하기"
}


// GPU(Shader)에서
uniform vec2 u_viewOrigin;
uniform mat4 u_projectMatrix;
attribute vec2 a_relativePosition; // 이미 offset 적용된 좌표

void main() {
  vec2 worldPosition = a_relativePosition + u_viewOrigin;
  gl_Position = u_projectMatrix * vec4(a_relativePosition, 0, 1);
}



renderInstructions.js
    generateLineStringRenderInstructions

    for (let i = 0, ii = batchEntry.flatCoordss.length; i < ii; i++) {
      flatCoords.length = batchEntry.flatCoordss[i].length;
      transform2D(
        batchEntry.flatCoordss[i],
        0,
        flatCoords.length,
        3,
        transform,
        flatCoords,
        3,
      );


bufferUtil.js
writeLineSegmentToBuffers

const invertTransform = createTransform();
makeInverseTransform(invertTransform, transform);

        // to compute join angles we need to reproject coordinates back in world units
const p0world = applyTransform(toWorldTransform, [...p0]);
const p1world = applyTransform(toWorldTransform, [...p1]);
