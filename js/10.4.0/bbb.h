export function generatePolygonRenderInstructions(
  batch,
  renderInstructions,
  customAttributes,
  transform,
  features
) {
  let verticesCount = 0;
  let geometriesCount = 0;
  let ringsCount = 0;

  const processedGeometries = [];

  // 1️⃣ 단일 루프에서 모든 데이터 사전 처리
  for (const feature of features) {
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();
    const stride = geometry.getStride();

    verticesCount += flatCoordinates.length / stride;
    ringsCount += ends.length;

    const inflatedEnds = inflateEnds(flatCoordinates, ends);
    geometriesCount += inflatedEnds.length;

    // transform2D 적용
    const transformedCoords = new Array(flatCoordinates.length);
    transform2D(flatCoordinates, 0, flatCoordinates.length, stride, transform, transformedCoords, stride);

    // 배열에 저장
    processedGeometries.push({ feature, transformedCoords, inflatedEnds, stride });
  }

  const totalInstructionsCount =
    2 * verticesCount +
    (1 + getCustomAttributesSize(customAttributes)) * geometriesCount +
    ringsCount;

  const renderInstructions2 = new Float32Array(totalInstructionsCount);

  let renderIndex = 0;
  let refCounter = 0;

  // 2️⃣ 사전 처리된 배열을 사용하여 루프 최적화
  for (const { feature, transformedCoords, inflatedEnds, stride } of processedGeometries) {
    ++refCounter;
    let offset = 0;

    for (const polygonEnds of inflatedEnds) {
      // 커스텀 속성 저장
      for (const key in customAttributes) {
        const attr = customAttributes[key];
        const value = attr.callback.call({ ref: refCounter }, feature);
        const size = attr.size ?? 1;

        for (let j = 0; j < size; j++) {
          renderInstructions2[renderIndex++] = value[j] ?? value;
        }
      }

      // ring 개수 저장
      renderInstructions2[renderIndex++] = polygonEnds.length;

      // 각 ring의 vertex 개수 저장
      for (let j = 0, jj = polygonEnds.length; j < jj; j++) {
        renderInstructions2[renderIndex++] =
          (polygonEnds[j] - (j === 0 ? 0 : polygonEnds[j - 1]) - offset) / stride;
      }

      // vertex 좌표 저장
      for (let j = 0, jj = polygonEnds.length; j < jj; j++) {
        let end = polygonEnds[j];

        for (let k = offset; k < end; k += stride) {
          renderInstructions2[renderIndex++] = transformedCoords[k];
          renderInstructions2[renderIndex++] = transformedCoords[k + 1];
        }
        offset = end;
      }
    }
  }
}
