export function generatePointRenderInstructions(
  batch,
  renderInstructions,
  customAttributes,
  transform,
  features,//kmg
) {
  //kmg
  let geometriesCount = 0;
  const geometryRenderEntries = [];

  for (const feature of features) {
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
  
    geometriesCount++;
  
    const pixelCoordinates = new Array(flatCoordinates.length);
    pixelCoordinates[0] = transform[0] * flatCoordinates[0] + transform[2] * flatCoordinates[1] + transform[4];
    pixelCoordinates[1] = transform[1] * flatCoordinates[0] + transform[3] * flatCoordinates[1] + transform[5];

    geometryRenderEntries.push({ feature, pixelCoordinates });
  }

  const totalInstructionsCount2 =
    (2 + getCustomAttributesSize(customAttributes)) * geometriesCount;
  
  const renderInstructions2 = new Float32Array(totalInstructionsCount2);
  
  let renderIndex2 = 0;
  let refCounter = 0;
  for (const entry of geometryRenderEntries) {
    ++refCounter;

    renderInstructions2[renderIndex2++] = entry.pixelCoordinates[0];
    renderInstructions2[renderIndex2++] = entry.pixelCoordinates[1];
    for (const key in customAttributes) {
      const attr = customAttributes[key];
      const value = attr.callback.call({ ref: refCounter }, entry.feature);
      const size = attr.size ?? 1;

      for (let i = 0; i < size; i++) {
        renderInstructions2[renderIndex2++] = value[i] ?? value;
      }
    }
  }
  ///
  export function generateLineStringRenderInstructions(
    batch,
    renderInstructions,
    customAttributes,
    transform,
    features,//kmg
  ) {
    //kmg
    let features2 = [];
    for (const featureUid in batch.entries) {
      const batchEntry = batch.entries[featureUid];
      features2.push(batchEntry.feature);
    }
  
    let verticesCount = 0;
    let geometriesCount = 0;
    
    const geometryRenderEntries = [];
    
    for (const feature of features) {
      const geometry = feature.getGeometry();
      const flatCoordinates = geometry.getFlatCoordinates();
      const ends = geometry.getEnds();
      const stride = geometry.getStride();
    
      verticesCount += flatCoordinates.length / stride;
      geometriesCount += ends.length;
    
      const pixelCoordinates = new Array(flatCoordinates.length);
      transform2D(
        flatCoordinates, 
        0, 
        flatCoordinates.length, 
        stride, 
        transform, 
        pixelCoordinates, 
        stride
      );
      geometryRenderEntries.push({ feature, pixelCoordinates, ends });
    }
    
    const totalInstructionsCount2 =
    3 * verticesCount +
    (1 + getCustomAttributesSize(customAttributes)) * geometriesCount;
    
    const renderInstructions2 = new Float32Array(totalInstructionsCount2);
    
    let renderIndex2 = 0;
    let refCounter = 0;
    
    for (const entry of geometryRenderEntries) {
      const stride = entry.feature.stride_;    
    
      ++refCounter;
      let offset = 0;
    
      for (const end of entry.ends) {
    
        for (const key in customAttributes) {
          const attr = customAttributes[key];
          const value = attr.callback.call({ ref: refCounter }, entry.feature);
          const size = attr.size ?? 1;
    
          for (let i = 0; i < size; i++) {
            renderInstructions2[renderIndex2++] = value[i] ?? value;
          }
        }
    
        // vertices count
        renderInstructions2[renderIndex2++] = (end - offset) / stride;
    
        // looping on points for positions
        for (let i = offset; i < end; i += stride) {
          renderInstructions2[renderIndex2++] = entry.pixelCoordinates[i]; 
          renderInstructions2[renderIndex2++] = entry.pixelCoordinates[i + 1];
          renderInstructions2[renderIndex2++] = stride === 3 ? entry.pixelCoordinates[i + 2] : 0;
        }
        offset = end;
      }
    }  

////
export function generatePolygonRenderInstructions(
  batch,
  renderInstructions,
  customAttributes,
  transform,
  features,//kmg
) {
  //kmg
  let verticesCount = 0;
  let geometriesCount = 0;
  let ringsCount = 0;

  const geometryRenderEntries = [];

  for (const feature of features) {
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();
    const stride = geometry.getStride();

    verticesCount += flatCoordinates.length / stride;
    ringsCount += ends.length;

    const multiPolygonEnds = inflateEnds(flatCoordinates, ends);
    geometriesCount += multiPolygonEnds.length;

    const pixelCoordinates = new Array(flatCoordinates.length);
    transform2D(
      flatCoordinates, 
      0, 
      flatCoordinates.length, 
      stride, 
      transform, 
      pixelCoordinates, 
      stride
    );
    geometryRenderEntries.push({ feature, pixelCoordinates, multiPolygonEnds });
  }

  const totalInstructionsCount2 =
    2 * verticesCount +
    (1 + getCustomAttributesSize(customAttributes)) * geometriesCount +
    ringsCount;

  const renderInstructions2 = new Float32Array(totalInstructionsCount2);

  let renderIndex2 = 0;
  let refCounter = 0;

  for (const entry of geometryRenderEntries) {
    const stride = entry.feature.stride_;    

    ++refCounter;
    let offset = 0;

    for (const polygonEnds of entry.multiPolygonEnds) {

      for (const key in customAttributes) {
        const attr = customAttributes[key];
        const value = attr.callback.call({ ref: refCounter }, entry.feature);
        const size = attr.size ?? 1;

        for (let i = 0; i < size; i++) {
          renderInstructions2[renderIndex2++] = value[i] ?? value;
        }
      }

      // ring count
      const ringsVerticesCount = polygonEnds.length;
      renderInstructions2[renderIndex2++] = ringsVerticesCount;

      // vertices count in each ring
      for (let i = 0; i < ringsVerticesCount; i++) {
        renderInstructions2[renderIndex2++] =
          (polygonEnds[i] - (i === 0 ? offset : polygonEnds[i - 1])) / stride;
      }

      // looping on points for positions
      for (let i = 0; i < ringsVerticesCount; i++) {
        let end = polygonEnds[i];

        for (let j = offset; j < end; j += 2) {
          renderInstructions2[renderIndex2++] = entry.pixelCoordinates[j];
          renderInstructions2[renderIndex2++] = entry.pixelCoordinates[j + 1];
        }
        offset = end;
      }
    }
  }
 
