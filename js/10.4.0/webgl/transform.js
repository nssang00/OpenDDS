
// 1. 버퍼 생성시
vertexArray.push(feature.x - origin.x); // origin을 뺀 오프셋만 저장
vertexArray.push(feature.y - origin.y);

// 2. projectionMatrix 생성시
setFromTransform(this.tmpTransform_, this.currentFrameStateTransform_);
// "꼭!" translateTransform으로 -origin을 추가
//translateTransform(this.tmpTransform_, -origin.x, -origin.y);
// batchInvertTransform 더이상 필요 없음!
this.helper.setUniformMatrixValue(
  Uniforms.PROJECTION_MATRIX,
  mat4FromTransform(this.tmpMat4_, this.tmpTransform_),
);

//////////
applyUniforms_(alpha, renderExtent, origin, tileZ, depth) {
  // 1. world to screen matrix (no batchInvertTransform)
  setFromTransform(this.tmpTransform_, this.currentFrameStateTransform_);
  // 여기서 origin은 [originX, originY]
  //translateTransform(this.tmpTransform_, -origin[0], -origin[1]);
  // multiplyTransform은 더이상 필요 없음!

  this.helper.setUniformMatrixValue(
    Uniforms.PROJECTION_MATRIX,
    mat4FromTransform(this.tmpMat4_, this.tmpTransform_),
  );

  // 2. screen to world matrix
  // (optionally, 실제 월드좌표로의 역변환이 필요하면)
  makeInverseTransform(this.tmpTransform_, this.currentFrameStateTransform_);
  // 실제로 world 좌표가 필요하면 origin도 더해줘야 함
  this.helper.setUniformMatrixValue(
    Uniforms.SCREEN_TO_WORLD_MATRIX,
    mat4FromTransform(this.tmpMat4_, this.tmpTransform_),
  );

  // 3. (선택) origin을 u_viewOrigin 등으로 따로 uniform으로 넘겨도 됨 (월드 복원 필요시)
  this.helper.setUniformFloatVec2(Uniforms.VIEW_ORIGIN, origin);

  this.helper.setUniformFloatValue(Uniforms.GLOBAL_ALPHA, alpha);
  this.helper.setUniformFloatValue(Uniforms.DEPTH, depth);
  this.helper.setUniformFloatValue(Uniforms.TILE_ZOOM_LEVEL, tileZ);
  this.helper.setUniformFloatVec4(Uniforms.RENDER_EXTENT, renderExtent);
}

// origin: 중심 좌표(예: 타일 중심, 뷰 중심 등)
vertexArray.push(feature.x - origin[0]);
vertexArray.push(feature.y - origin[1]);
// (z값이 있으면 z도 빼줌)
/////////

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
