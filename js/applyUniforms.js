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

applyUniforms_(alpha, renderExtent, batchInvertTransform, tileZ, depth) {
  // 타일 origin(월드 좌표의 타일 원점) 추출
  this.helper.setUniformFloatVec2(
    Uniforms.TILE_ORIGIN,
    [batchInvertTransform[4], batchInvertTransform[5]]
  );
  
  // 기존에 프레임마다 합쳤던 전체 매트릭스 업데이트 제거(이미 제거됨)
  
  // 나머지 uniform들
  this.helper.setUniformFloatValue(Uniforms.GLOBAL_ALPHA, alpha);
  this.helper.setUniformFloatValue(Uniforms.DEPTH, depth);
  this.helper.setUniformFloatValue(Uniforms.TILE_ZOOM_LEVEL, tileZ);
  this.helper.setUniformFloatVec4(Uniforms.RENDER_EXTENT, renderExtent);
}
/////
// Vertex Shader
uniform highp vec2 u_tileOrigin;  // 이름 변경


vec2 worldToPx(vec2 localPos) {
  vec2 worldPos = localPos + u_tileOrigin;
  vec4 screenPos = u_projectionMatrix * vec4(worldPos, 0.0, 1.0);
  return (0.5 * screenPos.xy + 0.5) * u_viewportSizePx;
}

vec2 worldToPx(vec2 worldPos) {
  // 원래 로컬 좌표(local) + tile origin -> 월드 좌표
  vec2 adjustedWorldPos = worldPos + u_tileOrigin;
  vec4 screenPos = u_projectionMatrix * vec4(adjustedWorldPos, 0.0, 1.0);
  return (0.5 * screenPos.xy + 0.5) * u_viewportSizePx;
}

vec2 localToPx(vec2 localPos) {
  vec2 worldPos = localPos + u_tileOrigin; // local -> world
  vec4 screenPos = u_projectionMatrix * vec4(worldPos, 0.0, 1.0);
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
