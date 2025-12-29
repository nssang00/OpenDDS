class WebGLTileLayerRenderer extends LayerRenderer {
  constructor(tileLayer, options) {
    super(tileLayer, options);
    
    // ... 기존 초기화 ...
    
    /**
     * @type {Object<string, boolean>}
     * @private
     */
    this.renderedTiles_ = Object.create(null);
    
    /**
     * @type {string|null}
     * @private
     */
    this.lastViewStateKey_ = null;
  }

  renderFrame(frameState) {
    this.frameState = frameState;
    
    // 🔹 뷰 상태가 변경되면 캐시 초기화
    const vs = frameState.viewState;
    const currentViewStateKey = 
      vs.resolution.toFixed(10) + '|' +
      vs.center[0].toFixed(6) + ',' + vs.center[1].toFixed(6) + '|' +
      (vs.rotation || 0).toFixed(10) + '|' +
      frameState.size[0] + ',' + frameState.size[1] + '|' +
      frameState.pixelRatio;
    
    if (currentViewStateKey !== this.lastViewStateKey_) {
      this.renderedTiles_ = Object.create(null);
      this.lastViewStateKey_ = currentViewStateKey;
    }
    
    this.renderComplete = true;
    const gl = this.helper.getGL();
    this.preRender(gl, frameState);

    // ... 기존 renderFrame 로직 전체 그대로 ...
    
    return canvas;
  }



////////////////////////////////
// renderer 인스턴스 속성
this.renderedTiles_ = null;
// renderer.renderFrame_ 시작 시 (매 프레임 초기화)
renderFrame_(frameState) {
  this.renderedTiles_ = Object.create(null);

  // ... 기존 renderFrame_ 로직 ...
}

drawTile_(
  frameState,
  tileRepresentation,
  tileZ,
  gutter,
  extent,
  alphaLookup,
  tileGrid,
) {
  // 1️⃣ 타일 준비 상태
  if (!tileRepresentation.ready) {
    return;
  }

  const tile = tileRepresentation.tile;
  const tileCoord = tile.tileCoord;
  const tileCoordKey = getTileCoordKey(tileCoord);

  // 2️⃣ alpha / fade
  const alpha =
    tileCoordKey in alphaLookup ? alphaLookup[tileCoordKey] : 1;
  const isOpaque = alpha >= 0.999;

  const viewState = frameState.viewState;

  // 3️⃣ tile/grid 정보
  const tileResolution = tileGrid.getResolution(tileZ);
  const tileSize = toSize(tileGrid.getTileSize(tileZ), this.tempSize_);
  const tileOrigin = tileGrid.getOrigin(tileZ);
  const tileExtent = tileGrid.getTileCoordExtent(tileCoord);

  // 4️⃣ renderKey (FP 안정화 포함)
  const renderKey =
    tileCoordKey + '|' +
    viewState.resolution.toFixed(10) + '|' +
    viewState.center[0].toFixed(6) + ',' +
    viewState.center[1].toFixed(6) + '|' +
    (viewState.rotation || 0).toFixed(10) + '|' +
    frameState.size[0] + ',' + frameState.size[1] + '|' +
    frameState.pixelRatio + '|' +
    gutter + '|' +
    alpha.toFixed(3) + '|' +
    this.getRevision() + '|' +
    (tile.getRevision?.() ?? 0);

  // 5️⃣ 이미 동일 상태로 렌더됨 → 스킵
  if (isOpaque && this.renderedTiles_[renderKey]) {
    return;
  }

  // 6️⃣ depth / animation
  const depth = isOpaque ? depthForZ(tileZ) : -1;
  if (!isOpaque) {
    frameState.animate = true;
  }

  // 7️⃣ transform 계산
  const centerX = viewState.center[0];
  const centerY = viewState.center[1];

  const tileWidthWithGutter = tileSize[0] + 2 * gutter;
  const tileHeightWithGutter = tileSize[1] + 2 * gutter;
  const aspectRatio = tileWidthWithGutter / tileHeightWithGutter;

  const centerI =
    (centerX - tileOrigin[0]) / (tileSize[0] * tileResolution);
  const centerJ =
    (tileOrigin[1] - centerY) / (tileSize[1] * tileResolution);

  const tileScale = viewState.resolution / tileResolution;

  const tileCenterI = tileCoord[1];
  const tileCenterJ = tileCoord[2];

  resetTransform(this.tileTransform_);
  scaleTransform(
    this.tileTransform_,
    2 / ((frameState.size[0] * tileScale) / tileWidthWithGutter),
    -2 / ((frameState.size[1] * tileScale) / tileWidthWithGutter),
  );
  rotateTransform(this.tileTransform_, viewState.rotation);
  scaleTransform(this.tileTransform_, 1, 1 / aspectRatio);
  translateTransform(
    this.tileTransform_,
    (tileSize[0] * (tileCenterI - centerI) - gutter) /
      tileWidthWithGutter,
    (tileSize[1] * (tileCenterJ - centerJ) - gutter) /
      tileHeightWithGutter,
  );

  // 8️⃣ 실제 렌더
  this.renderTile(
    tileRepresentation,
    this.tileTransform_,
    frameState,
    extent,
    tileResolution,
    tileSize,
    tileOrigin,
    tileExtent,
    depth,
    gutter,
    alpha,
  );

  // 9️⃣ 렌더 완료 기록
  if (isOpaque) {
    this.renderedTiles_[renderKey] = true;
  }
}
