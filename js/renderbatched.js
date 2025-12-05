class BatchedVectorTileRenderer {
  constructor() {
    this.batches = {
      fill: { vertices: [], indices: [], instances: [], offset: 0 },
      stroke: { vertices: [], indices: [], instances: [], offset: 0 },
      symbol: { vertices: [], indices: [], instances: [], offset: 0 },
    };
  }

  prepareFrame(frameState) {
    // 초기화
    Object.values(this.batches).forEach(b => {
      b.vertices.length = 0;
      b.indices.length = 0;
      b.instances.length = 0;
      b.offset = 0;
    });

    const deferredTasks = [];

    // 기존 타일 순회 로직 유지 (zs → representationsByZ)
    for (let j = 0, jj = zs.length; j < jj; ++j) {
      const tileZ = zs[j];
      for (const tileRepresentation of representationsByZ[tileZ]) {
        const tile = tileRepresentation.tile;
        const tileCoord = tile.tileCoord;
        const tileCoordKey = getTileCoordKey(tileCoord);

        if (tileCoordKey in alphaLookup) continue;
        if (!tileRepresentation.ready) continue;

        const alpha = tileCoordKey in alphaLookup ? alphaLookup[tileCoordKey] : 1;
        const depth = alpha < 1 ? -1 : depthForZ(tileZ);

        // transform 계산 (기존 drawTile_과 동일)
        const transform = this.calculateTileTransform(/* ... */);

        // 클로저로 나중에 실행할 작업 캡처
        deferredTasks.push({ tileRepresentation, transform, alpha, depth, tileZ });
      }
    }

    // === 1단계: 모든 타일의 데이터를 배치 버퍼에 수집 ===
    for (const task of deferredTasks) {
      this.collectTileData(task);
    }

    // === 2단계: 실제 그리기 (useProgram 3번) ===
    this.renderBatches(frameState);
  }

  collectTileData(task) {
    const { tileRepresentation, transform, alpha, depth, tileZ } = task;
    const buffers = tileRepresentation.buffers;
    if (!buffers) return;

    // 각 renderPass별로 버퍼 복사 + 인스턴스 데이터 추가
    this.appendToBatch('fill', buffers.polygonBuffers, { transform, alpha, depth, tileZ });
    this.appendToBatch('stroke', buffers.lineStringBuffers, { transform, alpha, depth, tileZ });
    this.appendToBatch('symbol', buffers.pointBuffers, { transform, alpha, depth, tileZ });
  }

  appendToBatch(type, srcBuffers, instanceData) {
    const batch = this.batches[type];
    const [indices, vertices, instances] = srcBuffers;

    const indexOffset = batch.vertices.length / vertexStride; // 버텍스 수 → 인덱스 오프셋

    // 인덱스 재계산해서 추가
    for (const idx of indices.data) {
      batch.indices.push(idx + indexOffset);
    }

    // 버텍스 그대로 추가
    batch.vertices.push(...vertices.data);

    // 인스턴스 속성 추가 (mat3 transform + float alpha + float depth + float tileZ)
    batch.instances.push(
      ...transform,     // 9개 float (mat3)
      alpha,
      depth,
      tileZ
    );
  }

  renderBatches(frameState) {
    for (const [type, batch] of Object.entries(this.batches)) {
      if (batch.indices.length === 0) continue;

      const renderPass = this.getRenderPassForType(type);

      this.helper_.useProgram(renderPass.program, frameState);

      // 대용량 버퍼 업로드 (한 프레임에 한 번)
      this.helper_.uploadBuffer(this.indexBuffer, batch.indices);
      this.helper_.uploadBuffer(this.vertexBuffer, batch.vertices);
      this.helper_.uploadBuffer(this.instanceBuffer, batch.instances);

      this.helper_.bindBuffer(this.vertexBuffer);
      this.helper_.bindBuffer(this.indexBuffer);
      this.helper_.bindBuffer(this.instanceBuffer);

      this.helper_.enableAttributes(renderPass.attributesDesc);
      this.helper_.enableAttributesInstanced(renderPass.instancedAttributesDesc);

      // 인스턴스 수 계산
      const instanceCount = batch.instances.length / instanceStride;

      this.helper_.drawElementsInstanced(0, batch.indices.length, instanceCount);
    }
  }
}
