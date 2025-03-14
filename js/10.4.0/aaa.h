export function generatePolygonRenderInstructions(
  batch,
  renderInstructions,
  customAttributes,
  transform,
  features,//kmg
) {
  //kmg
  /*
  let features2 = [];
  for (const featureUid in batch.entries) {
    const batchEntry = batch.entries[featureUid];
    features2.push(batchEntry.feature);
  }
  */
  let verticesCount = 0;
  let geometriesCount = 0;
  let ringsCount = 0;
  for (const feature of features) {
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();

    verticesCount += flatCoordinates.length / geometry.getStride();
    ringsCount += ends.length;

    geometriesCount += inflateEnds(flatCoordinates, ends).length;

  }

  const totalInstructionsCount2 =
    2 * verticesCount +
    (1 + getCustomAttributesSize(customAttributes)) * geometriesCount +
    ringsCount;

  const flatCoords2 = [];
  let renderIndex2 = 0;
  let renderInstructions2 = new Float32Array(totalInstructionsCount2);

  let refCounter = 0;
  for (const feature of features) {
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

    ++refCounter;
    let offset = 0;
    const multiPolygonEndss = inflateEnds(flatCoordinates, ends);
    for (const polygonEnds of multiPolygonEndss) {

      for (const key in customAttributes) {
        const attr = customAttributes[key];
        const value = attr.callback.call({ref:refCounter}, feature);
        const size = attr.size ?? 1;

        for (let j = 0; j < size; j++) {
          renderInstructions2[renderIndex2++] = value[j] ?? value;
        }
      }

      // ring count
      renderInstructions2[renderIndex2++] = polygonEnds.length;

      // vertices count in each ring
      for(let j = 0, jj = polygonEnds.length; j < jj; j++) {
          renderInstructions2[renderIndex2++] =
            (polygonEnds[j] - (j === 0 ? 0 : polygonEnds[j - 1]) - offset) / stride;
      }
  
      for(let j = 0, jj = polygonEnds.length; j < jj; j++) {
        let end = polygonEnds[j];

        // looping on points for positions
        for (let k = offset; k < end; k += stride) {
          renderInstructions2[renderIndex2++] = flatCoords2[k]; 
          renderInstructions2[renderIndex2++] = flatCoords2[k + 1];
        }
        offset = end;
      }

    }
  }
