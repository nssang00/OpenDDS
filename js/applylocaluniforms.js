  applyLocalUniforms(frameState, uniforms) {
    const gl = this.gl_;

    let value;
    let textureSlot = 0;
    uniforms.forEach((uniform) => {
      value =
        typeof uniform.value === 'function'
          ? uniform.value(frameState)
          : uniform.value;

      const location = this.getUniformLocation(uniform.name);          

      // apply value based on type
      if (
        value instanceof HTMLCanvasElement ||
        value instanceof HTMLImageElement ||
        value instanceof ImageData ||
        value instanceof WebGLTexture
      ) {
        if(value instanceof WebGLTexture) {
          uniform.texture = value;
        } else {
          if (!gl.textureCache) {
            gl.textureCache = new WeakMap();
          }

          if(gl.textureCache.has(value)) {
            uniform.texture = gl.textureCache.get(value);
          }
          else {
            uniform.texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, uniform.texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, value);

            gl.textureCache.set(value, uniform.texture);
          }
        }

        //this.bindTexture(uniform.texture, textureSlot, uniform.name);
        gl.activeTexture(gl.TEXTURE0 + textureSlot);
        gl.bindTexture(gl.TEXTURE_2D, uniform.texture);
        gl.uniform1i(location, textureSlot);        

        textureSlot++;
      } else {       
        const arr = Array.isArray(value) ? value : [value];
        const size = arr.length;

        switch (size) {
          case 1:
            gl.uniform1f(location, arr[0]);
            break;
          case 2:
            gl.uniform2f(location, arr[0], arr[1]);
            break;
          case 3:
            gl.uniform3f(location, arr[0], arr[1], arr[2]);
            break;
          case 4:
            gl.uniform4f(location, arr[0], arr[1], arr[2], arr[3]);
            break;
          case 16:
            gl.uniformMatrix4fv(location, false, fromTransform(this.tmpMat4_, arr));
            break;
          default:
            console.error(`not supported size: ${size}`);
        }
      }
    });
