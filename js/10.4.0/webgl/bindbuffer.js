    return [
      this.helper_.flushBufferData2(ELEMENT_ARRAY_BUFFER, buffers.indicesBuffer, DYNAMIC_DRAW),
      this.helper_.flushBufferData2(ARRAY_BUFFER, buffers.vertexAttributesBuffer, DYNAMIC_DRAW),
      this.helper_.flushBufferData2(ARRAY_BUFFER, buffers.instanceAttributesBuffer, DYNAMIC_DRAW),
    ];   

 bindBuffer2(buffer) {
    const gl = this.gl_;

    let bufferCache = null;
    if(this.webglBufferCache_.has(buffer)) {
      bufferCache = this.webglBufferCache_.get(buffer);
    }
    gl.bindBuffer(bufferCache.target, buffer);
  }

  getSize2(buffer) {
    const gl = this.gl_;

    let bufferCache = null;
    if(this.webglBufferCache_.has(buffer)) {
      bufferCache = this.webglBufferCache_.get(buffer);
    }
    return bufferCache.size;
  }
      
  flushBufferData2(target, buffer, usage) {
    const gl = this.gl_;
    const webGlBuffer = gl.createBuffer();
    const bufferCache = { target: target, size: buffer?.length ?? 0};
    this.webglBufferCache_.set(webGlBuffer, bufferCache);

    this.bindBuffer2(webGlBuffer);
    gl.bufferData(target, buffer, usage);
    return webGlBuffer;
  } 
  deleteBuffer2(buf) {
    //const bufferKey = getUid(buf);
    // Note: gl.deleteBuffer is not called here since we let WebGL garbage collect it automatically
    delete this.webglBufferCache_.delete(buf);
  }

class WebGLBufferCache {
  constructor() {
    this.cache = new WeakMap();
  }

  set(buffer, meta) {
    this.cache.set(buffer, meta);
  }

  get(buffer) {
    return this.cache.get(buffer);
  }

  has(buffer) {
    return this.cache.has(buffer);
  }
}

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
