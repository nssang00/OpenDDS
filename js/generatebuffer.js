uploadTile() {
    this.generateMaskBuffer_();

    this.batch_.clear();
    const sourceTiles = this.tile.getSourceTiles();
    const features = sourceTiles.reduce(
      (accumulator, sourceTile) => accumulator.concat(sourceTile.getFeatures()),
      [],
    );
    this.batch_.addFeatures(features);

    const tileOriginX = sourceTiles[0].extent[0];
    const tileOriginY = sourceTiles[0].extent[1];
    const transform = translateTransform(
      createTransform(),
      -tileOriginX,
      -tileOriginY,
    );

    // generateRenderInstructions_ 결과를 Promise로 래핑하여 비동기 처리
    const renderInstructionsPromise = new Promise((resolve) => {
        const instructions = this.generateRenderInstructions_(this.batch_, transform);
        resolve(instructions);
    });

    // renderInstructionsPromise 완료 후 처리
    renderInstructionsPromise.then((renderInstructions) => {
        const generatePromises = this.styleRenderers_.map((renderer, i) =>
          renderer.generateBuffers(renderInstructions, transform).then((buffers) => {
            this.buffers[i] = buffers;
          }),
        );

        Promise.all(generatePromises).then(() => {
            this.setReady();
        });
    });
}
async generateBuffers(renderInstructions, transform) {
    const [polygonBuffers, lineStringBuffers, pointBuffers] = await Promise.all([
        this.generateBuffersForType_(
          renderInstructions.polygonInstructions,
          'Polygon',
          transform,
        ),
        this.generateBuffersForType_(
          renderInstructions.lineStringInstructions,
          'LineString',
          transform,
        ),
        this.generateBuffersForType_(
          renderInstructions.pointInstructions,
          'Point',
          transform,
        ),
    ]);

    // 역변환 행렬 생성 및 반환
    const invertVerticesTransform = makeInverseTransform(
      createTransform(),
      transform,
    );
    return {
      polygonBuffers: polygonBuffers,
      lineStringBuffers: lineStringBuffers,
      pointBuffers: pointBuffers,
      invertVerticesTransform: invertVerticesTransform,
    };
}


async uploadTile() {
    this.generateMaskBuffer_();

    this.batch_.clear();
    const sourceTiles = this.tile.getSourceTiles();
    const features = sourceTiles.reduce(
      (accumulator, sourceTile) => accumulator.concat(sourceTile.getFeatures()),
      [],
    );
    this.batch_.addFeatures(features);

    const tileOriginX = sourceTiles[0].extent[0];
    const tileOriginY = sourceTiles[0].extent[1];
    const transform = translateTransform(
      createTransform(),
      -tileOriginX,
      -tileOriginY,
    );

    // generateRenderInstructions_ 결과를 비동기적으로 처리
    const renderInstructions = await new Promise((resolve) => {
        const instructions = this.generateRenderInstructions_(this.batch_, transform);
        resolve(instructions);
    });

    // 각 스타일 렌더러에 동일한 renderInstructions 전달
    const generatePromises = this.styleRenderers_.map((renderer, i) =>
      renderer.generateBuffers(renderInstructions, transform).then((buffers) => {
        this.buffers[i] = buffers;
      }),
    );

    // 모든 generateBuffers 작업이 완료될 때까지 대기
    await Promise.all(generatePromises);

    // 준비 상태 설정
    this.setReady();
}
