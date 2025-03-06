
  async generateBuffers(geometryBatch, transform, features) {
    let filteredBatch = geometryBatch;
    //kmg
    const result = {
      polygonFeatures: [],
      lineStringFeatures: [],
      pointFeatures: []
    };
    if (this.featureFilter_) {
      //kmg
      //filteredBatch = filteredBatch.filter(this.featureFilter_);
      const filtered = new MixedGeometryBatch();
      for(const feature of features) {
        if (this.featureFilter_(feature)) {
          filtered.addFeature(feature);
          const geometryType = feature.getGeometry().getType();

          switch (geometryType) {
            case 'MultiPolygon':
            case 'Polygon':
              result.polygonFeatures.push(feature);
              break;
            case 'MultiLineString':
            case 'LineString':
              result.lineStringFeatures.push(feature);
              break;
            case 'MultiPoint':
            case 'Point':
              result.pointFeatures.push(feature);
              break;
            default:
              break; // 다른 유형은 무시하거나 처리할 수 있습니다.
          }          

        }
      }
      filteredBatch = filtered;
      if (filteredBatch.isEmpty()) {
        return null;
      }
    }
//////////////

  /////////
  let features = [];
  for (const featureUid in batch.entries) {
    const batchEntry = batch.entries[featureUid];
    features.push(batchEntry.feature);
  }
  let verticesCount = 0;
  let geometriesCount = 0;
  for(const feature of features) {
    const geometry = feature.getGeometry();
    verticesCount += geometry.getFlatCoordinates().length / geometry.getStride();
    geometriesCount += geometry.getEnds().length;
  }

  const totalInstructionsCount2 =
    3 * verticesCount +
    (1 + getCustomAttributesSize(customAttributes)) * geometriesCount;

  const flatCoords2 = [];
  let renderIndex2 = 0;
  let renderInstructions2 = new Float32Array(totalInstructionsCount2);
  for (const feature of features) {
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const stride = geometry.getStride();
    const ends = geometry.genEnds();
    for(let i = 0, ii = ends.length; i < ii; i++) {
      let end = ends[i];
      let offset = 0;

      flatCoords2.length = flatCoordinates.length;
      transform2D(
        flatCoordinates,
        offset,//124, 140
        end,//flatCoords2.length,
        stride,
        transform,
        flatCoords2,
        stride,
      );

      for (const key in customAttributes) {
        const attr = customAttributes[key];
        const value = attr.callback(feature);
        const size = attr.size ?? 1;

        for (let i = 0; i < size; i++) {
          renderInstructions2[renderIndex2++] = value[i] ?? value;
        }
      }

      // vertices count
      renderInstructions2[renderIndex2++] = flatCoords2.length / stride;

      // looping on points for positions
      for (let i = 0, ii = flatCoords2.length; i < ii; i += stride) {
        for (let j = 0; j < stride; j++) {
          renderInstructions[renderIndex2++] = flatCoords2[i + j];
        }
      }
    }
  }
