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
