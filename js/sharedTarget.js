
if (!gl.getPostProcessPass) {
  gl.getPostProcessPasses = (() => {
    let pass = null;
    return () => {
      if (!pass) {
        pass = new WebGLPostProcessingPass({webGlContext: gl});
      }
      return pass;
    };
  })();
}

this.postProcessPasss_ = [gl.getPostProcessPasses()];
///////////////
const gl = this.helper_.getGL();

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
this.tileMaskTarget_ = gl.getTileMaskTarget(this.helper_);

/////////
if (!owner.getSharedRenderTarget) {
  owner.getSharedRenderTarget = (() => {
    let texture = null, framebuffer = null, depthbuffer = null;
    return () => {
      if (!texture) { /* create */ }
      return {texture, framebuffer, depthbuffer};
    };
  })();
}
const shared = owner.getSharedRenderTarget();

class WebGLRenderTarget {
  /**
   * @param {import("./Helper.js").default} helper WebGL helper; mandatory.
   * @param {Array<number>} [size] Expected size of the render target texture; note: this can be changed later on.
   */
  constructor(helper, size) {
    this.helper_ = helper;
    const gl = helper.getGL();

    // Helper 당 한 번만 shared 리소스 생성
    if (!helper.sharedRenderTarget) {
      helper.sharedRenderTarget = {
        texture: gl.createTexture(),
        framebuffer: gl.createFramebuffer(),
        depthbuffer: gl.createRenderbuffer(),
        currentSize: [1, 1]
      };
    }

    const shared = helper.sharedRenderTarget;
    this.texture_ = shared.texture;
    this.framebuffer_ = shared.framebuffer;
    this.depthbuffer_ = shared.depthbuffer;

    this.size_ = size || [1, 1];
    this.data_ = new Uint8Array(0);
    this.dataCacheDirty_ = true;

    this.updateSize_();
  }

  /**
   * Changes the size of the render target texture. Note: will do nothing if the size
   * is already the same.
   * @param {Array<number>} size Expected size of the render target texture
   */
  setSize(size) {
    if (equals(size, this.size_)) {
      return;
    }
    this.size_[0] = size[0];
    this.size_[1] = size[1];
    this.updateSize_();
  }

  /**
   * Returns the size of the render target texture
   * @return {Array<number>} Size of the render target texture
   */
  getSize() {
    return this.size_;
  }

  /**
   * This will cause following calls to `#readAll` or `#readPixel` to download the content of the
   * render target into memory, which is an expensive operation.
   * This content will be kept in cache but should be cleared after each new render.
   */
  clearCachedData() {
    this.dataCacheDirty_ = true;
  }

  /**
   * Returns the full content of the frame buffer as a series of r, g, b, a components
   * in the 0-255 range (unsigned byte).
   * @return {Uint8Array} Integer array of color values
   */
  readAll() {
    if (this.dataCacheDirty_) {
      const size = this.size_;
      const gl = this.helper_.getGL();

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer_);
      gl.readPixels(
        0,
        0,
        size[0],
        size[1],
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        this.data_,
      );
      this.dataCacheDirty_ = false;
    }
    return this.data_;
  }

  /**
   * Reads one pixel of the frame buffer as an array of r, g, b, a components
   * in the 0-255 range (unsigned byte).
   * If x and/or y are outside of existing data, an array filled with 0 is returned.
   * @param {number} x Pixel coordinate
   * @param {number} y Pixel coordinate
   * @return {Uint8Array} Integer array with one color value (4 components)
   */
  readPixel(x, y) {
    if (x < 0 || y < 0 || x > this.size_[0] || y >= this.size_[1]) {
      tmpArray4[0] = 0;
      tmpArray4[1] = 0;
      tmpArray4[2] = 0;
      tmpArray4[3] = 0;
      return tmpArray4;
    }

    this.readAll();
    const index =
      Math.floor(x) + (this.size_[1] - Math.floor(y) - 1) * this.size_[0];
    tmpArray4[0] = this.data_[index * 4];
    tmpArray4[1] = this.data_[index * 4 + 1];
    tmpArray4[2] = this.data_[index * 4 + 2];
    tmpArray4[3] = this.data_[index * 4 + 3];
    return tmpArray4;
  }

  /**
   * @return {WebGLTexture} Texture to render to
   */
  getTexture() {
    return this.texture_;
  }

  /**
   * @return {WebGLFramebuffer} Frame buffer of the render target
   */
  getFramebuffer() {
    return this.framebuffer_;
  }

  /**
   * @return {WebGLRenderbuffer} Depth buffer of the render target
   */
  getDepthbuffer() {
    return this.depthbuffer_;
  }

  /**
   * @private
   */
  updateSize_() {
    const size = this.size_;
    const shared = this.helper_.sharedRenderTarget;
    
    // 공유 리소스의 사이즈와 다르면 업데이트
    if (!equals(size, shared.currentSize)) {
      const gl = this.helper_.getGL();

      this.texture_ = this.helper_.createTexture(size, null, this.texture_);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer_);
      gl.viewport(0, 0, size[0], size[1]);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        this.texture_,
        0,
      );

      gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthbuffer_);
      gl.renderbufferStorage(
        gl.RENDERBUFFER,
        gl.DEPTH_COMPONENT16,
        size[0],
        size[1],
      );
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.RENDERBUFFER,
        this.depthbuffer_,
      );

      shared.currentSize = [size[0], size[1]];
    }

    this.data_ = new Uint8Array(size[0] * size[1] * 4);
  }
}

export default WebGLRenderTarget;
