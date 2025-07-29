async generateBuffersFromFeatures(features, transform) {
  const filteredFeatures = [];
  const featureIdSet = new Set();

  for (const styleShader of this.styleShaders) {
    const filtered = styleShader.featureFilter
      ? features.filter(styleShader.featureFilter)
      : features;

    for (const feature of filtered) {
      let featureId = feature.getId() || feature.ol_uid || feature.properties_.id;
      if (!featureIdSet.has(featureId) || featureId === undefined) {
        featureId != null && featureIdSet.add(featureId);
        filteredFeatures.push(feature);
      }
    }
  }

  // 내부 함수 정의 (featuresBatch 생성 + 버퍼 생성)
  function createBuffers(filteredFeatures, transform) {
    const featuresBatch = {
      polygonFeatures: [],
      lineStringFeatures: [],
      pointFeatures: []
    };

    for (const feature of filteredFeatures) {
      const geometryType = feature.getGeometry().getType();
      if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
        featuresBatch.polygonFeatures.push(feature);
        if (this.hasStroke_) featuresBatch.lineStringFeatures.push(feature);
      } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
        featuresBatch.lineStringFeatures.push(feature);
      } else if (geometryType === 'Point' || geometryType === 'MultiPoint') {
        featuresBatch.pointFeatures.push(feature);
      }
    }

    if (
      featuresBatch.polygonFeatures.length === 0 &&
      featuresBatch.lineStringFeatures.length === 0 &&
      featuresBatch.pointFeatures.length === 0
    ) {
      return null;
    }

    const renderInstructions = this.generateRenderInstructionsFromFeatures_(featuresBatch, transform);

    const label = `generateBuffersForType2_-${Date.now()}`;
    console.time(label);

    const polygonBuffers = this.generateWebGLBuffersFromInstructions_(
      renderInstructions.polygonInstructions,
      'Polygon', transform
    );
    const lineStringBuffers = this.generateWebGLBuffersFromInstructions_(
      renderInstructions.lineStringInstructions,
      'LineString', transform
    );
    const pointBuffers = this.generateWebGLBuffersFromInstructions_(
      renderInstructions.pointInstructions,
      'Point', transform
    );

    const invertVerticesTransform = makeInverseTransform(createTransform(), transform);
    console.timeEnd(label);

    return {
      polygonBuffers,
      lineStringBuffers,
      pointBuffers,
      invertVerticesTransform,
    };
  }

  // 내부 함수에서 this를 쓰면 바인딩 문제 있을 수 있으니, 화살표 함수로 선언하는 게 안전합니다!
  // const createBuffers = (filteredFeatures, transform) => { ... }

  // 생성 및 반환
  return createBuffers.call(this, filteredFeatures, transform);
}
