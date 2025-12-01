applyUniforms(frameState) {
  const gl = this.gl_;
  let textureSlot = 0;

  for (let i = 0; i < this.uniforms_.length; i++) {
    const uniform = this.uniforms_[i];

    const value = typeof uniform.value === 'function'
      ? uniform.value(frameState)
      : uniform.value;

    // -----------------------------
    // 1) 텍스처 계열 처리
    // -----------------------------
    if (
      value instanceof WebGLTexture ||
      value instanceof HTMLCanvasElement ||
      value instanceof HTMLImageElement ||
      value instanceof ImageData
    ) {
      // 텍스처 객체 초기화 (최초 1회만)
      if (!uniform.texture) {
        if (value instanceof WebGLTexture) {
          // 이미 텍스처가 만들어져 전달된 경우
          uniform.texture = value;
        } else {
          // 새 텍스처 생성 + 파라미터 설정
          uniform.texture = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, uniform.texture);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
      }

      // 슬롯/샘플러 바인딩
      // (bindTexture 내부에서 sampler uniform location 캐싱 가능)
      this.bindTexture(uniform.texture, textureSlot, uniform);

      // 데이터 업로드 (WebGLTexture는 외부에서 관리된다고 가정)
      if (!(value instanceof WebGLTexture)) {
        const imageReady =
          !(value instanceof HTMLImageElement) || value.complete;

        if (imageReady && uniform.prevValue !== value) {
          uniform.prevValue = value;
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            value
          );
        }
      }

      textureSlot++;
      continue;
    }

    // -----------------------------
    // 2) non-texture uniform location 캐싱
    // -----------------------------
    if (uniform.location === undefined) {
      uniform.location = this.getUniformLocation(uniform.name);
      // 최적화 과정에서 제거된/사용되지 않는 uniform 등은 null 일 수 있음
      if (!uniform.location) {
        continue;
      }
    }

    // -----------------------------
    // 3) 배열 타입 (행렬/벡터)
    // -----------------------------
    if (Array.isArray(value)) {
      const len = value.length;

      if (len === 6) {
        // 2D transform(길이 6)을 mat4로 변환해서 uniformMatrix로 전달
        this.setUniformMatrixValue(
          uniform.name,
          fromTransform(this.tmpMat4_, value)
        );
        continue;
      }

      if (len >= 2 && len <= 4) {
        switch (len) {
          case 2:
            gl.uniform2f(uniform.location, value[0], value[1]);
            break;
          case 3:
            gl.uniform3f(uniform.location, value[0], value[1], value[2]);
            break;
          case 4:
            gl.uniform4f(
              uniform.location,
              value[0],
              value[1],
              value[2],
              value[3]
            );
            break;
        }
        continue;
      }
    }

    // -----------------------------
    // 4) 스칼라
    // -----------------------------
    if (typeof value === 'number') {
      gl.uniform1f(uniform.location, value);
    }
  }
}
