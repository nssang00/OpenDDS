// vertex shader
uniform mat4 u_projectMatrix;
uniform vec2 u_viewOrigin;

attribute vec2 a_worldPosition;

void main() {
  vec2 localPos = a_worldPosition - u_viewOrigin; // or u_viewCenterOrigin, u_tileOrigin
  gl_Position = u_projectMatrix * vec4(localPos, 0, 1);
}

// CPU에서
const viewOrigin = getViewCenter(); // EPSG:3857 큰 값 (ex: [1.5e8, 4.2e7])
for (const feature of features) {
  vertexArray.push(feature.x - viewOrigin[0]);
  vertexArray.push(feature.y - viewOrigin[1]);
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
