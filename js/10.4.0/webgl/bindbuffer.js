  //kmg
  bindBuffer2(buffer) {
    const gl = this.gl_;

    if(this.webglBufferCache_.has(buffer)) {
      const bufferCache = this.webglBufferCache_.get(buffer);
      gl.bindBuffer(bufferCache.target, buffer);
    }
  }

  getSize(buffer) {
    return this.webglBufferCache_.get(buffer)?.size ?? 0;
  }
      
  flushBufferData2(target, data, usage) {
    const gl = this.gl_;
    const buffer = gl.createBuffer();

    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, usage);

    const bufferCache = { target: target, size: data?.length ?? 0};
    this.webglBufferCache_.set(buffer, bufferCache);    

    return buffer;
  } 

  deleteBuffer2(buf) {
    delete this.webglBufferCache_.delete(buf);
  }  
