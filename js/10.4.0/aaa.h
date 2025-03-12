  let features2 = [];
  for (const featureUid in batch.entries) {
    const batchEntry = batch.entries[featureUid];
    features2.push(batchEntry.feature);
  }
  
  let verticesCount = 0;
  let geometriesCount = 0;
  let ringsCount = 0;
  for (const feature of features2) {
    const geometry = feature.getGeometry();
    const ends = geometry.getEnds();
    verticesCount += geometry.getFlatCoordinates().length / geometry.getStride();
    geometriesCount++;
    ringsCount += ends.length;
  }
  console.log('polygon', features, features2);

  const totalInstructionsCount2 =
    2 * verticesCount +
    (1 + getCustomAttributesSize(customAttributes)) * geometriesCount +
    ringsCount;

  const flatCoords2 = [];
  let renderIndex2 = 0;
  let renderInstructions2 = new Float32Array(totalInstructionsCount2);

  for (const feature of features2) {
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const stride = geometry.getStride();
    const ends = geometry.getEnds();

    flatCoords2.length = flatCoordinates.length;
    transform2D(
      flatCoordinates,
      0,
      flatCoordinates.length,//flatCoords2.length,
      stride,
      transform,
      flatCoords2,
      stride,
    );

    for (const key in customAttributes) {
      const attr = customAttributes[key];
      const value = attr.callback.call({ref:1}, feature);
      const size = attr.size ?? 1;

      for (let j = 0; j < size; j++) {
        renderInstructions2[renderIndex2++] = value[j] ?? value;
      }
    }

    const ringsVerticesCount = ends.map((end, ind, arr) =>
      ind > 0 ? (end - arr[ind - 1]) / stride : end / stride,
    );
    // ring count
    renderInstructions2[renderIndex2++] = ringsVerticesCount.length;

    // vertices count in each ring
    for (let j = 0, jj = ringsVerticesCount.length; j < jj; j++) {
      renderInstructions2[renderIndex2++] = ringsVerticesCount[j];
    }

    let offset = 0;    
    for(let i = 0, ii = ends.length; i < ii; i++) {
      let end = ends[i];

      // looping on points for positions
      for (let j = offset; j < end; j += stride) {
        renderInstructions2[renderIndex2++] = flatCoords2[j]; 
        renderInstructions2[renderIndex2++] = flatCoords2[j + 1];
      }
      offset = end;
    }
  }
