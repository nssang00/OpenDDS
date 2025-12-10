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
