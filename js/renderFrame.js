class Map {
  constructor() {
    this.animationDelayKey_ = undefined;

    // 🔑 렌더링 상태 플래그
    this.isRenderingFrame_ = false; // renderFrame 실행 중
    this.needsRender_ = false;      // 실행 중 추가 render 요청 발생
  }

  /* =========================
   * render 요청 (의사 표시)
   * ========================= */
  render() {
    // 🔥 renderFrame 실행 중이면 요청만 기록
    if (this.isRenderingFrame_) {
      this.needsRender_ = true;
      return;
    }

    // RAF 중복 방지
    if (this.renderer_ && this.animationDelayKey_ === undefined) {
      this.animationDelayKey_ = requestAnimationFrame(this.animationDelay_);
    }
  }

  /* =========================
   * RAF 콜백
   * ========================= */
  animationDelay_ = () => {
    this.animationDelayKey_ = undefined;
    this.renderFrame_(Date.now());
  };

  /* =========================
   * 실제 렌더링
   * ========================= */
  renderFrame_(time) {
    let frameState = null;
    this.isRenderingFrame_ = true;

    try {
      const size = this.getSize();
      const view = this.getView();
      const previousFrameState = this.frameState_;

      if (size && hasArea(size) && view && view.isDef()) {
        const viewHints = view.getHints(
          this.frameState_ ? this.frameState_.viewHints : undefined,
        );
        const viewState = view.getState();

        frameState = {
          animate: false,
          coordinateToPixelTransform: this.coordinateToPixelTransform_,
          declutter: null,
          extent: getForViewAndSize(
            viewState.center,
            viewState.resolution,
            viewState.rotation,
            size,
          ),
          index: this.frameIndex_++,
          layerIndex: 0,
          layerStatesArray: this.getLayerGroup().getLayerStatesArray(),
          pixelRatio: this.pixelRatio_,
          pixelToCoordinateTransform: this.pixelToCoordinateTransform_,
          postRenderFunctions: [],
          size,
          tileQueue: this.tileQueue_,
          time,
          usedTiles: {},
          viewState,
          viewHints,
          wantedTiles: {},
          mapId: getUid(this),
          renderTargets: {},
        };

        if (viewState.nextCenter && viewState.nextResolution) {
          const rotation = isNaN(viewState.nextRotation)
            ? viewState.rotation
            : viewState.nextRotation;

          frameState.nextExtent = getForViewAndSize(
            viewState.nextCenter,
            viewState.nextResolution,
            rotation,
            size,
          );
        }
      }

      this.frameState_ = frameState;

      // 🔥 실제 렌더러 호출
      this.renderer_.renderFrame(frameState);

      if (frameState) {
        // 🔥 애니메이션 요청은 "의사 표시"만
        if (frameState.animate) {
          this.needsRender_ = true;
        }

        // postRenderFunctions 병합
        Array.prototype.push.apply(
          this.postRenderFunctions_,
          frameState.postRenderFunctions,
        );

        // ===== moveStart / moveEnd 처리 =====
        if (previousFrameState) {
          const moveStart =
            !this.previousExtent_ ||
            (!isEmpty(this.previousExtent_) &&
              !equalsExtent(frameState.extent, this.previousExtent_));

          if (moveStart) {
            this.dispatchEvent(
              new MapEvent(MapEventType.MOVESTART, this, previousFrameState),
            );
            this.previousExtent_ = createOrUpdateEmpty(this.previousExtent_);
          }
        }

        const idle =
          this.previousExtent_ &&
          !frameState.viewHints[ViewHint.ANIMATING] &&
          !frameState.viewHints[ViewHint.INTERACTING] &&
          !equalsExtent(frameState.extent, this.previousExtent_);

        if (idle) {
          this.dispatchEvent(
            new MapEvent(MapEventType.MOVEEND, this, frameState),
          );
          clone(frameState.extent, this.previousExtent_);
        }
      }
    } finally {
      // 🔚 renderFrame 종료
      this.isRenderingFrame_ = false;
    }

    /* =========================
     * 🔁 renderFrame 중 발생한 요청 처리
     * ========================= */
    if (this.needsRender_) {
      this.needsRender_ = false;
      this.render(); // 다음 RAF로 1회만 이어짐
    }

    // ===== POSTRENDER 이벤트 =====
    this.dispatchEvent(
      new MapEvent(MapEventType.POSTRENDER, this, frameState),
    );

    // ===== renderComplete 체크 (진짜 idle일 때만) =====
    if (!this.needsRender_) {
      this.renderComplete_ =
        (this.hasListener(MapEventType.LOADSTART) ||
          this.hasListener(MapEventType.LOADEND) ||
          this.hasListener(RenderEventType.RENDERCOMPLETE)) &&
        !this.tileQueue_.getTilesLoading() &&
        !this.tileQueue_.getCount() &&
        !this.getLoadingOrNotReady();
    }

    if (!this.postRenderTimeoutHandle_) {
      this.postRenderTimeoutHandle_ = setTimeout(() => {
        this.postRenderTimeoutHandle_ = undefined;
        this.handlePostRender();
      }, 0);
    }
  }

  /* =========================
   * 타일 변경 트리거
   * ========================= */
  handleTileChange_() {
    this.render();
  }
}
