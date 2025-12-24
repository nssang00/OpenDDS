ol/webgl/RenderTarget.js
updateSize_()
 this.data_ = new UintArray(size[0] * size[1] * 4);

readPixel
 -> 
    if(this.data_.length === 0) {
      this.data_ = new Uint8Array(size[0] * size[1] * 4);
    }

RenderTarget.js
updateSize_()
 this.texture_ = this.helper_.createTexture

PosProcessingPass.js
init()
gl.texImage2D
//////////
ol/webgl/Helper.js
    //2025.11.27 kmg
    const gl = this.gl_;
    if (!gl.getPostProcessPass) {
      gl.getPostProcessPass = (() => {
        let pass = null;
        return (options) => {
          if (!pass) {
            pass = new WebGLPostProcessingPass(options);
          }
          return pass;
        };
      })();
    }  
        
    this.postProcessPasses_ = options.postProcesses
      ? options.postProcesses.map(
          (options) =>
            new WebGLPostProcessingPass({
              webGlContext: this.gl_,
              scaleRatio: options.scaleRatio,
              vertexShader: options.vertexShader,
              fragmentShader: options.fragmentShader,
              uniforms: options.uniforms,
            }),
        )
      //2025.11.27 kmg
      //: [new WebGLPostProcessingPass({webGlContext: this.gl_})];
      : [gl.getPostProcessPass({webGlContext: this.gl_})];

////////////
ol/renderer/webgl/VectorTileLayer.js

  initTileMask_() {
    //2025.11.27 kmg
    const gl = this.helper.getGL();
    if (!gl.getTileMaskTarget) {
      gl.getTileMaskTarget = (() => {
        let target = null;
        return (helper) => {
          if (!target) {
            target = new WebGLRenderTarget(helper);
          }
          return target;
        };
      })();
    }
    //this.tileMaskTarget_ = new WebGLRenderTarget(this.helper);    
    this.tileMaskTarget_ = this.workerEnabled_ 
      ? new WebGLRenderTarget(this.helper) 
      : gl.getTileMaskTarget(this.helper);
