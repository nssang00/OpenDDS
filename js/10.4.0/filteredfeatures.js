const featuresBatch = {
  polygonFeatures: [],
  lineStringFeatures: [],
  pointFeatures: []
};

// featureFilter_가 존재하면 필터링된 features만 처리, 없으면 전체 features 처리
const filteredFeatures = this.featureFilter_ ? features.filter(this.featureFilter_) : features;

for (const feature of filteredFeatures) {
  const geometryType = feature.getGeometry().getType();

  switch (geometryType) {
    case 'MultiPolygon':
    case 'Polygon':
      featuresBatch.polygonFeatures.push(feature);
      if (this.hasStroke_) featuresBatch.lineStringFeatures.push(feature);
      break;
    case 'MultiLineString':
    case 'LineString':
      featuresBatch.lineStringFeatures.push(feature);
      break;
    case 'MultiPoint':
    case 'Point':
      featuresBatch.pointFeatures.push(feature);
      break;
    default:
      break;
  }
}

if (featuresBatch.polygonFeatures.length === 0 && 
    featuresBatch.lineStringFeatures.length === 0 && 
    featuresBatch.pointFeatures.length === 0) {
  return null;
}

return featuresBatch;
