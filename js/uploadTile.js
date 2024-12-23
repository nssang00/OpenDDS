uploadTile() {
    this.generateMaskBuffer_();
/*
    this.batch_.clear();
    const sourceTiles = this.tile.getSourceTiles();
    const features = sourceTiles.reduce(
      (accumulator, sourceTile) => accumulator.concat(sourceTile.getFeatures()),
      [],
    );
    this.batch_.addFeatures(features);
    */
    ////////////kmg
    const sourceTiles = this.tile.getSourceTiles();
    if (!this.tile.geometryBatch) {    
      this.tile.geometryBatch = (() => {
        let batch = null;

        return (action, data) => {
            if(!batch) {
                batch = new MixedGeometryBatch();
                const sourceTiles = this.tile.getSourceTiles();
                const features = sourceTiles.reduce(
                    (accumulator, sourceTile) => accumulator.concat(sourceTile.getFeatures()),
                    [],
                );
                console.log('addfeatures ' + this.tile.tileCoord)
                batch.addFeatures(features);                
            }
            return batch;
        };
      })();
    }
    const batch = this.tile.geometryBatch();
    ////////////

    const tileOriginX = sourceTiles[0].extent[0];
    const tileOriginY = sourceTiles[0].extent[1];
    const transform = translateTransform(
      createTransform(),
      -tileOriginX,
      -tileOriginY,
    );
/*
    const generatePromises = this.styleRenderers_.map((renderer, i) =>
      renderer.generateBuffers(this.batch_, transform).then((buffers) => {
        this.buffers[i] = buffers;
      }),
    );
    */
    const generatePromises = this.styleRenderers_.map((renderer, i) =>
      renderer.generateBuffers(batch, transform).then((buffers) => {
        this.buffers[i] = buffers;
      }),
    );
    Promise.all(generatePromises).then(() => {
      this.setReady();
    });
  }
