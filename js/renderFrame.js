
class Map2 extends BaseObject {
  constructor(options) {
    super(options);

    this.isRendering_ = false;      // renderFrame_ 실행 중
    this.needsNextFrame_ = false;   // 렌더링 중 들어온 요청 예약
    this.isInPostRender_ = false;   // postRender 실행 중 (순환 방지)

  }

  render() {
    if (this.isRendering_ || this.isInPostRender_) {
      this.needsNextFrame_ = true;
      return;  
    }

    if (this.animationDelayKey_ !== undefined) {
      return;
    }

    if (this.renderer_) {
      this.animationDelayKey_ = requestAnimationFrame(this.animationDelay_);
    }
  }

  animationDelay_(timestamp) {
    this.animationDelayKey_ = undefined;
    this.isRendering_ = true;

    try {
      this.renderFrame_(timestamp || Date.now());
    } finally {
      this.isRendering_ = false;
    }

    if (this.needsNextFrame_) {
      this.needsNextFrame_ = false;
      this.render();
    }
  }

  handleTileChange_() {
    this.render();  // render()가 알아서 체크
  }

  handleSizeChanged_() {
    if (this.getView() && !this.getView().getAnimating()) {
      this.getView().resolveConstraints(0);
    }
    this.render();
  }

  handleViewPropertyChanged_() {
    this.render();
  }

  handlePostRender() {
    this.isInPostRender_ = true;

    try {
      const frameState = this.frameState_;
      const tileQueue = this.tileQueue_;

      // 타일 로딩
      if (!tileQueue.isEmpty()) {
        let maxTotalLoading = this.maxTilesLoading_;
        let maxNewLoads = maxTotalLoading;

        if (frameState) {
          const hints = frameState.viewHints;
          if (hints[ViewHint.ANIMATING] || hints[ViewHint.INTERACTING]) {
            const lowOnFrameBudget = Date.now() - frameState.time > 8;
            maxTotalLoading = lowOnFrameBudget ? 0 : 8;
            maxNewLoads = lowOnFrameBudget ? 0 : 2;
          }
        }

        if (tileQueue.getTilesLoading() < maxTotalLoading) {
          tileQueue.reprioritize();
          tileQueue.loadMoreTiles(maxTotalLoading, maxNewLoads);
        }
      }

      // RENDERCOMPLETE / LOAD 이벤트
      if (frameState && this.renderer_ && !frameState.animate) {
        if (this.renderComplete_) {
          if (this.hasListener(RenderEventType.RENDERCOMPLETE)) {
            this.renderer_.dispatchRenderEvent(
              RenderEventType.RENDERCOMPLETE,
              frameState
            );
          }
          if (this.loaded_ === false) {
            this.loaded_ = true;
            this.dispatchEvent(
              new MapEvent(MapEventType.LOADEND, this, frameState)
            );
          }
        } else if (this.loaded_ === true) {
          this.loaded_ = false;
          this.dispatchEvent(
            new MapEvent(MapEventType.LOADSTART, this, frameState)
          );
        }
      }

      // postRenderFunctions 실행
      if (frameState) {
        const funcs = this.postRenderFunctions_;
        for (let i = 0, ii = funcs.length; i < ii; ++i) {
          funcs[i](this, frameState);
        }
        funcs.length = 0;
      }

    } finally {
      this.isInPostRender_ = false;
    }
  }

}


