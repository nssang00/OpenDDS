// renderFrame 수정
renderFrame() {
  // ... 기존 코드 ...
  
  // 배치 초기화
  this.renderBatches_ = {
    fill: [],
    stroke: [],
    symbol: []
  };
  
  // 모든 타일 순회하며 배치에 저장 (한 번만!)
  for (let j = 0, jj = zs.length; j < jj; ++j) {
    const tileZ = zs[j];
    for (const tileRepresentation of representationsByZ[tileZ]) {
      const tileCoord = tileRepresentation.tile.tileCoord;
      const tileCoordKey = getTileCoordKey(tileCoord);
      if (tileCoordKey in alphaLookup) {
        continue;
      }
      
      // passType 없이 호출 - 배치 수집 모드
      this.drawTile_(
        frameState,
        tileRepresentation,
        tileZ,
        gutter,
        extent,
        alphaLookup,
        tileGrid,
      );
    }
  }
  
  // passType별로 배치 실행
  this.flushBatch_('fill');
  this.flushBatch_('stroke');
  this.flushBatch_('symbol');
  
  // 배치 정리
  this.renderBatches_ = null;
}

// drawTile_는 원래대로 (passType 파라미터 제거)
drawTile_(
  frameState,
  tileRepresentation,
  tileZ,
  gutter,
  extent,
  alphaLookup,
  tileGrid,
) {
  if (!tileRepresentation.ready) {
    return;
  }
  const tile = tileRepresentation.tile;
  const tileCoord = tile.tileCoord;
  const tileCoordKey = getTileCoordKey(tileCoord);
  const alpha = tileCoordKey in alphaLookup ? alphaLookup[tileCoordKey] : 1;

  const tileResolution = tileGrid.getResolution(tileZ);
  const tileSize = toSize(tileGrid.getTileSize(tileZ), this.tempSize_);
  const tileOrigin = tileGrid.getOrigin(tileZ);
  const tileExtent = tileGrid.getTileCoordExtent(tileCoord);
  const depth = alpha < 1 ? -1 : depthForZ(tileZ);
  if (alpha < 1) {
    frameState.animate = true;
  }

  const viewState = frameState.viewState;
  const centerX = viewState.center[0];
  const centerY = viewState.center[1];

  const tileWidthWithGutter = tileSize[0] + 2 * gutter;
  const tileHeightWithGutter = tileSize[1] + 2 * gutter;
  const aspectRatio = tileWidthWithGutter / tileHeightWithGutter;

  const centerI = (centerX - tileOrigin[0]) / (tileSize[0] * tileResolution);
  const centerJ = (tileOrigin[1] - centerY) / (tileSize[1] * tileResolution);
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
    (tileSize[0] * (tileCenterI - centerI) - gutter) / tileWidthWithGutter,
    (tileSize[1] * (tileCenterJ - centerJ) - gutter) / tileHeightWithGutter,
  );

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
}

// renderTile도 원래대로 (passType 파라미터 제거)
renderTile(
  tileRepresentation,
  tileTransform,
  frameState,
  renderExtent,
  tileResolution,
  tileSize,
  tileOrigin,
  tileExtent,
  depth,
  gutter,
  alpha,
) {
  const gutterExtent = getIntersection(tileExtent, renderExtent, tileExtent);
  const tileZ = tileRepresentation.tile.getTileCoord()[0];
  const buffers = tileRepresentation.buffers;
  if (!buffers) {
    return;
  }
  this.styleRenderer_.render(buffers, frameState, () => {
    this.applyUniforms_(
      alpha,
      gutterExtent,
      buffers.invertVerticesTransform,
      tileZ,
      depth,
    );
  });
}

// render 함수 수정 - renderInternal_ 호출 대신 배치에 저장
render(buffers, frameState, preRenderCallback) {
  for (const renderPass of this.renderPasses_) {
    if (renderPass.contextFilter) {
      if(!renderPass.contextFilter(frameState.viewState.resolution)) {
        continue;
      }
    }

    // renderInternal_ 호출 대신 배치에 저장
    if (renderPass.fillRenderPass) {
      this.addToBatch_('fill', {
        indicesBuffer: buffers.polygonBuffers[0],
        vertexAttributesBuffer: buffers.polygonBuffers[1],
        instanceAttributesBuffer: buffers.polygonBuffers[2],
        subRenderPass: renderPass.fillRenderPass,
        frameState: frameState,
        preRenderCallback: preRenderCallback,
      });
    }
    
    if (renderPass.strokeRenderPass) {
      this.addToBatch_('stroke', {
        indicesBuffer: buffers.lineStringBuffers[0],
        vertexAttributesBuffer: buffers.lineStringBuffers[1],
        instanceAttributesBuffer: buffers.lineStringBuffers[2],
        subRenderPass: renderPass.strokeRenderPass,
        frameState: frameState,
        preRenderCallback: preRenderCallback,
      });
    }
    
    if (renderPass.symbolRenderPass) {
      this.addToBatch_('symbol', {
        indicesBuffer: buffers.pointBuffers[0],
        vertexAttributesBuffer: buffers.pointBuffers[1],
        instanceAttributesBuffer: buffers.pointBuffers[2],
        subRenderPass: renderPass.symbolRenderPass,
        frameState: frameState,
        preRenderCallback: preRenderCallback,
      });
    }
  }
}

// 배치에 추가하는 헬퍼 함수
addToBatch_(passType, renderData) {
  if (!this.renderBatches_) {
    return; // 배치 모드가 아니면 무시
  }
  this.renderBatches_[passType].push(renderData);
}

// 특정 passType의 배치를 실행
flushBatch_(passType) {
  if (!this.renderBatches_ || !this.renderBatches_[passType]) {
    return;
  }

  const batch = this.renderBatches_[passType];
  
  for (const renderData of batch) {
    this.renderInternal_(
      renderData.indicesBuffer,
      renderData.vertexAttributesBuffer,
      renderData.instanceAttributesBuffer,
      renderData.subRenderPass,
      renderData.frameState,
      renderData.preRenderCallback,
    );
  }
}


///////////////////////////////////////////////
// renderInternal_을 batch 수집 모드와 실행 모드로 분리
renderInternal_(
  indicesBuffer,
  vertexAttributesBuffer,
  instanceAttributesBuffer,
  subRenderPass,
  frameState,
  preRenderCallback,
) {
  const renderCount = this.helper_.getSize(indicesBuffer);
  if (renderCount === 0) {
    return;
  }

  const usesInstancedRendering = subRenderPass.instancedAttributesDesc.length;

  // batch에 추가 (실제 렌더링은 나중에)
  if (!this.renderBatches_) {
    this.renderBatches_ = new Map(); // program별로 그룹화
  }

  const programKey = subRenderPass.program; // 또는 program의 고유 ID
  
  if (!this.renderBatches_.has(programKey)) {
    this.renderBatches_.set(programKey, {
      program: subRenderPass.program,
      subRenderPass: subRenderPass,
      frameState: frameState,
      drawCalls: []
    });
  }

  this.renderBatches_.get(programKey).drawCalls.push({
    indicesBuffer,
    vertexAttributesBuffer,
    instanceAttributesBuffer,
    renderCount,
    usesInstancedRendering,
    preRenderCallback,
  });
}

// renderFrame에서 호출
renderFrame() {
  // ... 기존 코드 ...
  
  // 1. 배치 초기화
  this.renderBatches_ = new Map();
  
  // 2. passType별로 순회하며 배치에 추가
  const renderPassTypes = ['fill', 'stroke', 'symbol'];
  
  for (const passType of renderPassTypes) {
    for (let j = 0, jj = zs.length; j < jj; ++j) {
      const tileZ = zs[j];
      for (const tileRepresentation of representationsByZ[tileZ]) {
        const tileCoord = tileRepresentation.tile.tileCoord;
        const tileCoordKey = getTileCoordKey(tileCoord);
        if (tileCoordKey in alphaLookup) {
          continue;
        }
        
        this.drawTile_(
          frameState,
          tileRepresentation,
          tileZ,
          gutter,
          extent,
          alphaLookup,
          tileGrid,
          passType,
        );
      }
    }
    
    // 3. 각 passType이 끝날 때마다 해당 타입의 배치 실행
    this.flushRenderBatches_();
  }
}

// 모아둔 배치를 실제로 렌더링
flushRenderBatches_() {
  if (!this.renderBatches_ || this.renderBatches_.size === 0) {
    return;
  }

  // program별로 그룹화된 draw call들을 한번에 실행
  for (const [programKey, batch] of this.renderBatches_) {
    const { program, subRenderPass, frameState, drawCalls } = batch;
    
    // program은 한번만 설정
    this.helper_.useProgram(program, frameState);
    
    // 같은 program을 사용하는 모든 draw call 실행
    for (const drawCall of drawCalls) {
      const {
        indicesBuffer,
        vertexAttributesBuffer,
        instanceAttributesBuffer,
        renderCount,
        usesInstancedRendering,
        preRenderCallback,
      } = drawCall;
      
      this.helper_.bindBuffer(vertexAttributesBuffer);
      this.helper_.bindBuffer(indicesBuffer);
      this.helper_.enableAttributes(subRenderPass.attributesDesc);
      this.helper_.bindBuffer(instanceAttributesBuffer);
      this.helper_.enableAttributesInstanced(
        subRenderPass.instancedAttributesDesc,
      );
      
      preRenderCallback();
      
      if (usesInstancedRendering) {
        const instanceAttributesStride =
          subRenderPass.instancedAttributesDesc.reduce(
            (prev, curr) => prev + (curr.size || 1),
            0,
          );
        const instanceCount = this.helper_.getSize(instanceAttributesBuffer) / instanceAttributesStride;
        
        this.helper_.drawElementsInstanced(0, renderCount, instanceCount);
      } else {
        this.helper_.drawElements(0, renderCount);
      }
    }
  }
  
  // 배치 초기화
  this.renderBatches_.clear();
}
