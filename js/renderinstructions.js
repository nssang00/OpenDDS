// ... 기존 코드 ...
generateRenderInstructions_(features, transform) {
  const lineStringFeatures = features.filter(feature => {
    const geometry = feature.getGeometry();
    return geometry.getType() === 'LineString';
  }).map(feature => ({
    feature: feature,
    flatCoordinates: feature.getGeometry().getFlatCoordinates(),
    stride: feature.getGeometry().getStride(),
  }));

  const polygonFeatures = features.filter(feature => {
    const geometry = feature.getGeometry();
    return geometry.getType() === 'Polygon';
  }).map(feature => ({
    feature: feature,
    flatCoordinates: feature.getGeometry().getFlatCoordinates(),
    ends: feature.getGeometry().getEnds(),
    stride: feature.getGeometry().getStride(),
  }));

  const pointFeatures = features.filter(feature => {
    const geometry = feature.getGeometry();
    return geometry.getType() === 'Point';
  }).map(feature => ({
    feature: feature,
    flatCoordinates: feature.getGeometry().getFlatCoordinates(),
    stride: feature.getGeometry().getStride(),
  }));

  const lineStringInstructions = this.hasStroke_
    ? generateLineStringRenderInstructions(
        lineStringFeatures,
        new Float32Array(0),
        this.customAttributes_,
        transform,
      )
    : null;

  const polygonInstructions = this.hasFill_
    ? generatePolygonRenderInstructions(
        polygonFeatures,
        new Float32Array(0),
        this.customAttributes_,
        transform,
      )
    : null;

  const pointInstructions = this.hasSymbol_
    ? generatePointRenderInstructions(
        pointFeatures,
        new Float32Array(0),
        this.customAttributes_,
        transform,
      )
    : null;

  return {
    polygonInstructions,
    lineStringInstructions,
    pointInstructions,
  };
}
// ... 기존 코드 ...

export function generateLineStringRenderInstructions(
  lineStringFeatures,
  renderInstructions,
  customAttributes,
  transform,
) {
  const totalInstructionsCount = lineStringFeatures.reduce((count, item) => {
    return count + 2 * item.flatCoordinates.length / item.stride;
  }, 0) + lineStringFeatures.length * (1 + getCustomAttributesSize(customAttributes));

  if (!renderInstructions || renderInstructions.length !== totalInstructionsCount) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }

  const flatCoords = [];
  let renderIndex = 0;
  for (const item of lineStringFeatures) {
    flatCoords.length = item.flatCoordinates.length;
    transform2D(
      item.flatCoordinates,
      0,
      flatCoords.length,
      2,
      transform,
      flatCoords,
    );
    renderIndex += pushCustomAttributesInRenderInstructions(
      renderInstructions,
      customAttributes,
      { feature: item.feature },
      renderIndex,
    );

    // vertices count
    renderInstructions[renderIndex++] = flatCoords.length / 2;

    // looping on points for positions
    for (let j = 0, jj = flatCoords.length; j < jj; j += 2) {
      renderInstructions[renderIndex++] = flatCoords[j];
      renderInstructions[renderIndex++] = flatCoords[j + 1];
    }
  }
  return renderInstructions;
}

export function generatePolygonRenderInstructions(
  polygonFeatures,
  renderInstructions,
  customAttributes,
  transform,
) {
  const totalInstructionsCount = polygonFeatures.reduce((count, item) => {
    return count + 2 * item.flatCoordinates.length / item.stride + item.ends.length;
  }, 0) + polygonFeatures.length * (1 + getCustomAttributesSize(customAttributes));

  if (!renderInstructions || renderInstructions.length !== totalInstructionsCount) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }

  const flatCoords = [];
  let renderIndex = 0;
  for (const item of polygonFeatures) {
    flatCoords.length = item.flatCoordinates.length;
    transform2D(
      item.flatCoordinates,
      0,
      flatCoords.length,
      2,
      transform,
      flatCoords,
    );
    renderIndex += pushCustomAttributesInRenderInstructions(
      renderInstructions,
      customAttributes,
      { feature: item.feature },
      renderIndex,
    );

    // ring count
    renderInstructions[renderIndex++] = item.ends.length;

    // vertices count in each ring
    for (let j = 0, jj = item.ends.length; j < jj; j++) {
      const startIndex = j > 0 ? item.ends[j - 1] : 0;
      renderInstructions[renderIndex++] = (item.ends[j] - startIndex) / item.stride;

      // looping on points for positions in each ring
      for (let k = startIndex; k < item.ends[j]; k += item.stride) {
        renderInstructions[renderIndex++] = flatCoords[k];
        renderInstructions[renderIndex++] = flatCoords[k + 1];
      }
    }
  }
  return renderInstructions;
}

export function generatePointRenderInstructions(
  pointFeatures,
  renderInstructions,
  customAttributes,
  transform,
) {
  const totalInstructionsCount = pointFeatures.reduce((count, item) => {
    return count + 2;
  }, 0) + pointFeatures.length * getCustomAttributesSize(customAttributes);

  if (!renderInstructions || renderInstructions.length !== totalInstructionsCount) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }

  const tmpCoords = [];
  let renderIndex = 0;
  for (const item of pointFeatures) {
    tmpCoords[0] = item.flatCoordinates[0];
    tmpCoords[1] = item.flatCoordinates[1];
    applyTransform(transform, tmpCoords);

    renderInstructions[renderIndex++] = tmpCoords[0];
    renderInstructions[renderIndex++] = tmpCoords[1];
    renderIndex += pushCustomAttributesInRenderInstructions(
      renderInstructions,
      customAttributes,
      { feature: item.feature },
      renderIndex,
    );
  }
  return renderInstructions;
}
