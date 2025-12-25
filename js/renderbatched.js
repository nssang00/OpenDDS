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

  handleTileChange_(tile, layer) {
    if (this.isInPostRender_) return;
    
    this.dirtyLayers_.add(layer);  // Dirty 추적
    this.render();  // RAF 스케줄 (중복 안 됨)
  }

  renderFrame_() {
    // Dirty 레이어만 업데이트
    for (const layer of this.dirtyLayers_) {
      layer.updateBuffer();
    }
    this.dirtyLayers_.clear();
    
    // 전체 렌더링
    this.drawAllLayers();
  }
}
