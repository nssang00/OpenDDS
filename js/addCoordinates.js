addCoordinates_(
  geometryType,
  flatCoords,
  ends,
  feature,
  featureUid,
  stride,
  layout,
  options = { updateLineStringBatch: true } // 기본값은 LineStringBatch 업데이트
) {
  switch (geometryType) {
    case 'LinearRing': {
      // LinearRing 처리
      if (!options.updateLineStringBatch) {
        // LineStringBatch 업데이트 방지 플래그가 설정된 경우 처리 중단
        break;
      }

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

      // LineStringBatch 업데이트
      this.lineStringBatch.verticesCount += verticesCount;
      this.lineStringBatch.geometriesCount++;
      this.lineStringBatch.entries[featureUid].flatCoordss.push(
        getFlatCoordinatesXYM(flatCoords, stride, layout),
      );
      this.lineStringBatch.entries[featureUid].verticesCount += verticesCount;
      break;
    }

    case 'LineString': {
      // LineString 처리
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

      // LineStringBatch 업데이트
      this.lineStringBatch.verticesCount += verticesCount;
      this.lineStringBatch.geometriesCount++;
      this.lineStringBatch.entries[featureUid].flatCoordss.push(
        getFlatCoordinatesXYM(flatCoords, stride, layout),
      );
      this.lineStringBatch.entries[featureUid].verticesCount += verticesCount;
      break;
    }

    case 'Polygon': {
      // Polygon 처리
      const verticesCount = flatCoords.length / stride;
      const ringsCount = ends.length;
      const ringsVerticesCount = ends.map((end, ind, arr) =>
        ind > 0 ? (end - arr[ind - 1]) / stride : end / stride,
      );

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

      // PolygonBatch 업데이트
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

      // LinearRing을 Polygon 내부에서 처리
      for (let i = 0, ii = ends.length; i < ii; i++) {
        const startIndex = i > 0 ? ends[i - 1] : 0;
        this.addCoordinates_(
          'LinearRing',
          flatCoords.slice(startIndex, ends[i]),
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

    case 'Point': {
      // Point 처리
      if (!this.pointBatch.entries[featureUid]) {
        this.pointBatch.entries[featureUid] = this.addRefToEntry_(
          featureUid,
          {
            feature: feature,
            flatCoordss: [],
          },
        );
      }

      // PointBatch 업데이트
      this.pointBatch.geometriesCount++;
      this.pointBatch.entries[featureUid].flatCoordss.push(flatCoords);
      break;
    }

    default:
      // 다른 지오메트리는 처리하지 않음
      break;
  }
}
