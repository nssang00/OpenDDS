class Map {
  constructor() {
    this._renderScheduled = false;
    this.isInPostRender_ = false;
  }

  render() {
    // 1. RAF 중복 방지
    if (this._renderScheduled) return;
    
    this._renderScheduled = true;
    requestAnimationFrame((timestamp) => {
      this._renderScheduled = false;
      this.renderFrame_(timestamp);
    });
  }

  handleTileChange_() {
    // 2. PostRender 순환 차단
    if (this.isInPostRender_) return;
    
    this.render();  // RAF로 자동 배치됨
  }

  handlePostRender() {
    this.isInPostRender_ = true;
    try {
      // ... 기존 로직 ...
    } finally {
      queueMicrotask(() => {
        this.isInPostRender_ = false;
      });
    }
  }
}
//////////////;
class Map {
  constructor() {
    this.renderScheduled_ = false;
    this.dirtyLayers_ = new Set();
  }

  render() {
    if (this.renderScheduled_) return;  // 🔥 중복 방지
    
    this.renderScheduled_ = true;
    requestAnimationFrame(() => {
      this.renderScheduled_ = false;
      this.renderFrame_();
    });
  }
}
///////////////
class Map {
  constructor(options) {
    
    this.renderScheduled_ = false;
    this.isRendering_ = false;
    this.needsNextFrame_ = false;

  }

  render() {
    // 🔴 render 중이면 → 다음 프레임으로 이월
    if (this.isRendering_) {
      this.needsNextFrame_ = true;
      return;
    }

    // 🔴 이미 rAF 예약돼 있으면 중복 무시
    if (this.renderScheduled_) {
      return;
    }

    this.renderScheduled_ = true;

    if (this.renderer_ && this.animationDelayKey_ === undefined) {
      this.animationDelayKey_ = requestAnimationFrame(this.animationDelay_);
    }
  }


  /**
   * @private
   */
  animationDelay_() {
    this.animationDelayKey_ = undefined;
    this.renderScheduled_ = false;

    // 🔵 render 시작
    this.isRendering_ = true;

    try {
      this.renderFrame_(Date.now());
    } finally {
      this.isRendering_ = false;
    }

    // 🔵 render 중 발생한 비동기 요청이 있으면 다음 프레임 예약
    if (this.needsNextFrame_) {
      this.needsNextFrame_ = false;
      this.render();
    }
  }

  

}

