// 프레임 시작
prepareFrame() {
  // 기본 projection만 설정 (한 번)
  this.helper.setUniformMatrixValue(
    Uniforms.PROJECTION_MATRIX,
    mat4FromTransform(this.tmpMat4_, this.currentFrameStateTransform_)
  );
  
  // screen to world도 한 번만
  makeInverseTransform(this.tmpTransform_, this.currentFrameStateTransform_);
  this.helper.setUniformMatrixValue(
    Uniforms.SCREEN_TO_WORLD_MATRIX,
    mat4FromTransform(this.tmpMat4_, this.tmpTransform_),
  );
}

// 타일마다
applyUniforms_(alpha, renderExtent, batchInvertTransform, tileZ, depth) {
  // 타일 offset 추출 (가벼움)
  this.helper.setUniformFloatVec2(
    Uniforms.TILE_OFFSET,
    [batchInvertTransform[4], batchInvertTransform[5]]
  );
  
  // 기존 코드 제거
  // setFromTransform(this.tmpTransform_, this.currentFrameStateTransform_);
  // multiplyTransform(this.tmpTransform_, batchInvertTransform);
  // this.helper.setUniformMatrixValue(...);  // ← 이거 삭제
  
  // 나머지는 그대로
  this.helper.setUniformFloatValue(Uniforms.GLOBAL_ALPHA, alpha);
  this.helper.setUniformFloatValue(Uniforms.DEPTH, depth);
  this.helper.setUniformFloatValue(Uniforms.TILE_ZOOM_LEVEL, tileZ);
  this.helper.setUniformFloatVec4(Uniforms.RENDER_EXTENT, renderExtent);
}
Shader 수정
// Vertex Shader에 추가
uniform vec2 u_tileOffset;  // 새로 추가

vec2 worldToPx(vec2 worldPos) {
  // 로컬 좌표 → 월드 좌표 변환 추가
  vec2 adjustedWorldPos = worldPos + u_tileOffset;
  vec4 screenPos = u_projectionMatrix * vec4(adjustedWorldPos, 0.0, 1.0);
  return (0.5 * screenPos.xy + 0.5) * u_viewportSizePx;
}



//////////////////
bindTexture(texture, slot, uniformName) {
    const gl = this.gl_;
    gl.activeTexture(gl.TEXTURE0 + slot);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.getUniformLocation(uniformName), slot);
  }

applyUniforms(frameState) {
  const gl = this.gl_;

  let value;
  let textureSlot = 0;
  
  this.uniforms_.forEach((uniform) => {
    value =
      typeof uniform.value === 'function'
        ? uniform.value(frameState)
        : uniform.value;
    
    if (
      value instanceof HTMLCanvasElement ||
      value instanceof HTMLImageElement ||
      value instanceof ImageData ||
      value instanceof WebGLTexture
    ) {
      if (value instanceof WebGLTexture) {
        if (uniform.texture !== value) {
          uniform.prevValue = undefined;
          uniform.texture = value;
          uniform.textureInitialized = false; // 새 텍스처이니 파라미터 다시 세팅
        }
      } else if (!uniform.texture) {
        // 처음 non-WebGLTexture를 사용하는 경우에만 텍스처 생성
        uniform.prevValue = undefined;
        uniform.texture = gl.createTexture();
        uniform.textureInitialized = false; // 새 텍스처 → 파라미터 세팅 필요
      }

      this.bindTexture(uniform.texture, textureSlot, uniform.name);
      
      if (!uniform.textureInitialized) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        uniform.textureInitialized = true;
      }

      const imageReady =
        !(value instanceof HTMLImageElement) ||
        /** @type {HTMLImageElement} */ (value).complete;

      if (
        !(value instanceof WebGLTexture) &&
        imageReady &&
        uniform.prevValue !== value
      ) {
        uniform.prevValue = value;
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          value,
        );
      }
      textureSlot++;
    } else if (Array.isArray(value)) {
      const len = value.length;
      if (len === 6) {
        this.setUniformMatrixValue(
          uniform.name,
          fromTransform(this.tmpMat4_, value),
        );
      } else if (len <= 4) {
        const location = this.getUniformLocation(uniform.name);
        if (len === 2) {
          gl.uniform2f(location, value[0], value[1]);
        } else if (len === 3) {
          gl.uniform3f(location, value[0], value[1], value[2]);
        } else if (len === 4) {
          gl.uniform4f(location, value[0], value[1], value[2], value[3]);
        }
      }
    } else if (typeof value === 'number') {
      gl.uniform1f(this.getUniformLocation(uniform.name), value);
    }
  });
}
