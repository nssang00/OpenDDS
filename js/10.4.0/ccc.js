//tilegeometry.js
uploadTile() {
    this.generateMaskBuffer_();
    //kmg
    this.batch_.clear();
    const sourceTiles = this.tile.getSourceTiles();
    const features = sourceTiles.reduce(
      (accumulator, sourceTile) => accumulator.concat(sourceTile.getFeatures()),
      [],
    );
    //this.batch_.addFeatures(features);
    /*
    //kmg tile마다 하나의 geometryBatch를 가짐. source를 공유할때만 효과가 있음
    if (!this.tile.getGeometryBatch) {    
      this.tile.getGeometryBatch = (() => {
        let batch = null;

        return (action, data) => {
            if(!batch) {
                batch = new MixedGeometryBatch();
                batch.addFeatures(features);
            }
            return batch;
        };
      })();
    }
    this.batch_ = this.tile.getGeometryBatch();
    */

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
    );*/
    //kmg
    ///*
    const generatePromises = this.styleRenderers_.map((renderer, i) =>
      renderer.generateBuffersFromFeatures(features, transform).then((buffers) => {
        this.buffers[i] = buffers;
      }),
    );//*/

    Promise.all(generatePromises).then(() => {
      this.setReady();
    });
  }

///vectorstylerenderer.js
  //kmg
  async generateBuffersFromFeatures(features, transform) {

    const filteredFeatures = this.featureFilter_ ? features.filter(this.featureFilter_) : features;
    const featuresBatch = {
      polygonFeatures: [],
      lineStringFeatures: [],
      pointFeatures: []
    };

    for(const feature of filteredFeatures) {
      const geometryType = feature.getGeometry().getType();
      if(geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
        featuresBatch.polygonFeatures.push(feature);
        if(this.hasStroke_)
          featuresBatch.lineStringFeatures.push(feature);
      } else if(geometryType === 'LineString' || geometryType === 'MultiLineString') {
        featuresBatch.lineStringFeatures.push(feature);
      } else if(geometryType === 'Point' || geometryType === 'MultiPoint') {
        featuresBatch.pointFeatures.push(feature);
      } else {

      }   
    }
    if (featuresBatch.polygonFeatures.length === 0 && 
      featuresBatch.lineStringFeatures.length === 0 && 
      featuresBatch.pointFeatures.length === 0) {
      return null;
    }

    const renderInstructions = this.generateRenderInstructionsFromFeatures_(
      featuresBatch,
      transform,
    );
    const [polygonBuffers, lineStringBuffers, pointBuffers] = await Promise.all(
      [
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
      ],
    );
    // also return the inverse of the transform that was applied when generating buffers
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
