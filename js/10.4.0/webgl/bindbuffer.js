bindBuffer(buffer) {
    const gl = this.gl_;
    const bufferKey = getUid(buffer);
    let bufferCache = this.bufferCache_[bufferKey];
    if (!bufferCache) {
      const webGlBuffer = gl.createBuffer();
      bufferCache = {
        buffer: buffer,
        webGlBuffer: webGlBuffer,
      };
      this.bufferCache_[bufferKey] = bufferCache;
    }
    gl.bindBuffer(buffer.getType(), bufferCache.webGlBuffer);
  }

  /**
   * Update the data contained in the buffer array; this is required for the
   * new data to be rendered
   * @param {import("./Buffer").default} buffer Buffer.
   */
  flushBufferData(buffer) {
    const gl = this.gl_;
    this.bindBuffer(buffer);
    gl.bufferData(buffer.getType(), buffer.getArray(), buffer.getUsage());
  }


const indicesBuffer = new WebGLArrayBuffer(
          ELEMENT_ARRAY_BUFFER,
          DYNAMIC_DRAW,
        ).fromArrayBuffer(received.indicesBuffer);
        const vertexAttributesBuffer = new WebGLArrayBuffer(
          ARRAY_BUFFER,
          DYNAMIC_DRAW,
        ).fromArrayBuffer(received.vertexAttributesBuffer);
        const instanceAttributesBuffer = new WebGLArrayBuffer(
          ARRAY_BUFFER,
          DYNAMIC_DRAW,
        ).fromArrayBuffer(received.instanceAttributesBuffer);
        this.helper_.flushBufferData(indicesBuffer);
        this.helper_.flushBufferData(vertexAttributesBuffer);
        this.helper_.flushBufferData(instanceAttributesBuffer);

this.helper_.useProgram(subRenderPass.program, frameState);
    this.helper_.bindBuffer(vertexAttributesBuffer);
    this.helper_.bindBuffer(indicesBuffer);
    this.helper_.enableAttributes(subRenderPass.attributesDesc);
    this.helper_.bindBuffer(instanceAttributesBuffer);
    this.helper_.enableAttributesInstanced(
      subRenderPass.instancedAttributesDesc,
    );
