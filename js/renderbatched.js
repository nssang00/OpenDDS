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


