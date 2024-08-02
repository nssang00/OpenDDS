class MapLoader {
  // ... 기존 코드 ...

  applyMap() {
    if (!this.parsedStyles || !this.parsedLayers) {
      console.error('Styles or layers have not been parsed yet.');
      return null;
    }

    const olStyles = this.toOlMapStyle(this.parsedStyles);
    const olLayers = this.toOlMapLayer(this.parsedLayers);

    // 각 레이어에 스타일 적용
    for (const layerName in olLayers) {
      const layer = olLayers[layerName];
      if (Array.isArray(layer)) {
        // 그룹 레이어인 경우
        layer.forEach(subLayer => this.applyStyleToLayer(subLayer, olStyles));
      } else {
        // 단일 레이어인 경우
        this.applyStyleToLayer(layer, olStyles);
      }
    }

    return olLayers;
  }

  applyStyleToLayer(layer, olStyles) {
    if (!layer.features) return;

    layer.features.forEach(feature => {
      const geometryStyle = feature.GeometryStyle && olStyles[feature.GeometryStyle];
      const labelStyle = feature.LabelStyle && olStyles[feature.LabelStyle];

      if (geometryStyle || labelStyle) {
        feature.style = [];
        if (geometryStyle) feature.style.push(...(Array.isArray(geometryStyle) ? geometryStyle : [geometryStyle]));
        if (labelStyle) feature.style.push(labelStyle);
      }
    });
  }

  // ... 기존 코드 ...
}

// 사용 예시
const mapLoader = new MapLoader();
mapLoader.parseMap(xmlMapStyle, xmlMapLayer);
const finalMap = mapLoader.applyMap();
console.log(JSON.stringify(finalMap, null, 2));
