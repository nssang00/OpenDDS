case 'Polygon': {
  verticesCount = flatCoords.length / stride;
  const ringsCount = ends.length;
  const ringsVerticesCount = ends.map((end, ind, arr) =>
    ind > 0 ? (end - arr[ind - 1]) / stride : end / stride,
  );

  // PolygonBatch 업데이트
  if (!this.polygonBatch.entries[featureUid]) {
    this.polygonBatch.entries[featureUid] = this.addRefToEntry_(
      featureUid,
      {
        feature: feature,
        flatCoordss: [],
        ringsVerticesCounts: [],
        verticesCount: 0,
        ringsCount: 0,
      },
    );
  }

  this.polygonBatch.verticesCount += verticesCount;
  this.polygonBatch.ringsCount += ringsCount;
  this.polygonBatch.geometriesCount++;
  this.polygonBatch.entries[featureUid].flatCoordss.push(
    getFlatCoordinatesXY(flatCoords, stride),
  );
  this.polygonBatch.entries[featureUid].ringsVerticesCounts.push(
    ringsVerticesCount,
  );
  this.polygonBatch.entries[featureUid].verticesCount += verticesCount;
  this.polygonBatch.entries[featureUid].ringsCount += ringsCount;

  // LinearRing 데이터를 PolygonBatch 내부에서 처리
  for (let i = 0, ii = polygonEnds.length; i < ii; i++) {
    const startIndex = i > 0 ? polygonEnds[i - 1] : 0;
    this.addCoordinates_(
      'LinearRing',
      flatCoords.slice(startIndex, polygonEnds[i]),
      null,
      feature,
      featureUid,
      stride,
      layout,
      { updateLineStringBatch: false } // LineStringBatch 업데이트 방지
    );
  }
  break;
}

case 'LineString':
case 'LinearRing': {
  if (!this.lineStringBatch.entries[featureUid]) {
    this.lineStringBatch.entries[featureUid] = this.addRefToEntry_(
      featureUid,
      {
        feature: feature,
        flatCoordss: [],
        verticesCount: 0,
      },
    );
  }

  verticesCount = flatCoords.length / stride;

  // LineStringBatch 업데이트
  this.lineStringBatch.verticesCount += verticesCount;
  this.lineStringBatch.geometriesCount++;
  this.lineStringBatch.entries[featureUid].flatCoordss.push(
    getFlatCoordinatesXYM(flatCoords, stride, layout),
  );
  this.lineStringBatch.entries[featureUid].verticesCount += verticesCount;
  break;
}

case 'Point': {
  if (!this.pointBatch.entries[featureUid]) {
    this.pointBatch.entries[featureUid] = this.addRefToEntry_(
      featureUid,
      {
        feature: feature,
        flatCoordss: [],
      },
    );
  }

  this.pointBatch.geometriesCount++;
  this.pointBatch.entries[featureUid].flatCoordss.push(flatCoords);
  break;
}

default:
  // Pass
  break;
}
/////
addCoordinates_(
  geometryType,
  flatCoords,
  ends,
  feature,
  featureUid,
  stride,
  layout,
  options = { updateLineStringBatch: true }
) {
  if (geometryType === 'LinearRing' && !options.updateLineStringBatch) {
    // LineStringBatch를 업데이트하지 않음
    return;
  }

  if (geometryType === 'LineString' || geometryType === 'LinearRing') {
    if (!this.lineStringBatch.entries[featureUid]) {
      this.lineStringBatch.entries[featureUid] = this.addRefToEntry_(
        featureUid,
        {
          feature: feature,
          flatCoordss: [],
          verticesCount: 0,
        },
      );
    }
    const verticesCount = flatCoords.length / stride;
    this.lineStringBatch.verticesCount += verticesCount;
    this.lineStringBatch.geometriesCount++;
    this.lineStringBatch.entries[featureUid].flatCoordss.push(
      getFlatCoordinatesXYM(flatCoords, stride, layout),
    );
    this.lineStringBatch.entries[featureUid].verticesCount += verticesCount;
  }
}
