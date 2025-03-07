let features = [];
for (const featureUid in batch.entries) {
  const batchEntry = batch.entries[featureUid];
  features.push(batchEntry.feature);
}

let verticesCount = 0;
let geometriesCount = 0;
for (const feature of features) {
  const geometry = feature.getGeometry();
  verticesCount += geometry.getFlatCoordinates().length / geometry.getStride();
  geometriesCount += geometry.getEnds().length;
}

const totalInstructionsCount2 =
  3 * verticesCount + (1 + getCustomAttributesSize(customAttributes)) * geometriesCount;

const flatCoords2 = [];
let renderIndex2 = 0;
let renderInstructions2 = new Float32Array(totalInstructionsCount2);

for (const feature of features) {
  const geometry = feature.getGeometry();
  const flatCoordinates = geometry.getFlatCoordinates();
  const stride = geometry.getStride();
  const ends = geometry.getEnds();

  flatCoords2.length = flatCoordinates.length;
  transform2D(
    flatCoordinates,
    0,
    flatCoords2.length,
    stride,
    transform,
    flatCoords2,
    stride,
  );

  let offset = 0;
  for (let i = 0, ii = ends.length; i < ii; i++) {
    let end = ends[i];

    for (const key in customAttributes) {
      const attr = customAttributes[key];
      const value = attr.callback(feature);
      const size = attr.size ?? 1;

      for (let j = 0; j < size; j++) {
        renderInstructions2[renderIndex2++] = value[j] ?? value;
      }
    }

    // vertices count
    renderInstructions2[renderIndex2++] = (end - offset) / stride;

    // 항상 x, y, m 형태로 저장 (stride == 3이면 기존 m 유지, 아니면 0)
    for (let j = offset; j < end; j += stride) {
      renderInstructions2[renderIndex2++] = flatCoords2[j];       // x
      renderInstructions2[renderIndex2++] = flatCoords2[j + 1];   // y
      renderInstructions2[renderIndex2++] = stride === 3 ? flatCoords2[j + 2] : 0; // 기존 stride가 3이면 유지, 아니면 0
    }

    offset = end;
  }
}
