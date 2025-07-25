      // parse each style and convert to shader
      const styleShaders = ruleStyles.map((style) =>
        ({//kmg
          ...parseLiteralStyle(style, variables, currentFilter),
          attributes: {},
          ...(featureFilter && {featureFilter}), 
          ...(contextFilter && {contextFilter}),
        })
        
      );

////////
    const featureIdSet = new Set();
    for (const styleShader of this.styleShaders) {
      const filtered = styleShader.featureFilter
        ? features.filter(styleShader.featureFilter)
        : features;

      for (const feature of filtered) {
        let featureId = feature.getId() || feature.ol_uid || feature.properties_.id;
        if (!featureIdSet.has(featureId) || featureId === undefined) {
          featureId != null && featureIdSet.add(featureId);
          filteredFeatures.push(feature);
        }
      }
    }

bindBuffer(buffer) {
    const gl = this.gl_;
    //kmg
    if(buffer instanceof WebGLBuffer) {
      if(this.webGlBufferCache_.has(buffer)) {
        const bufferCache = this.webGlBufferCache_.get(buffer);
        gl.bindBuffer(bufferCache.target, buffer);
      }
      return;
    }

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
  
  flushBufferData(buffer, target, usage) {
    const gl = this.gl_;
    //kmg
    if(buffer instanceof Uint32Array || buffer instanceof Float32Array)
    {
      const webGlBuffer = gl.createBuffer();

      gl.bindBuffer(target, webGlBuffer);
      gl.bufferData(target, buffer, usage);

      const bufferCache = { target: target, size: buffer?.length ?? 0};
      this.webGlBufferCache_.set(webGlBuffer, bufferCache);    

      return webGlBuffer;
    } 

    this.bindBuffer(buffer);
    gl.bufferData(buffer.getType(), buffer.getArray(), buffer.getUsage());
  }
  

  /**
   * @param {import("./Buffer.js").default} buf Buffer.
   */
  deleteBuffer(buf) {
    //kmg
    if(buf instanceof WebGLBuffer) {
      delete this.webGlBufferCache_.delete(buf);
      return;
    }

    const bufferKey = getUid(buf);
    // Note: gl.deleteBuffer is not called here since we let WebGL garbage collect it automatically
    delete this.bufferCache_[bufferKey];
  }

  //kmg
  getSize(buffer) {
    return this.webGlBufferCache_.get(buffer)?.size ?? 0;
  }
