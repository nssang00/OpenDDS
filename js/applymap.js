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

import LayerGroup from 'ol/layer/Group';

class MapLoader {
  // ... 기존 코드 ...

  applyMap(map) {
    if (!this.parsedStyles || !this.parsedLayers) {
      console.error('Styles or layers have not been parsed yet.');
      return;
    }

    const olStyles = this.toOlMapStyle(this.parsedStyles);

    this.parsedLayers.forEach(layer => {
      const processedLayer = this.processLayer(layer, olStyles);
      if (processedLayer) {
        map.addLayer(processedLayer);
      }
    });
  }

  processLayer(layer, olStyles) {
    if (layer.type === 'Layer') {
      return this.createVectorTileLayer(layer, olStyles);
    } else if (layer.type === 'Group') {
      return this.createLayerGroup(layer, olStyles);
    }
  }

  createLayerGroup(groupLayer, olStyles) {
    const layers = groupLayer.layers.map(subLayer => this.processLayer(subLayer, olStyles)).filter(Boolean);
    return new LayerGroup({
      layers: layers,
      properties: { name: groupLayer.Name, category: groupLayer.Category }
    });
  }

  createVectorTileLayer(layer, olStyles) {
    const scaleMap = {
      "25K": 9.554628535647032,
      "50K": 19.109257071294063,
      "100K": 38.21851414258813,
      "250K": 152.8740565703525,
      "500K": 305.748113140705,
      "1M": 611.49622628141
    };

    const resolutions = layer.Map.split(',').map(v => scaleMap[v.trim()]);
    const minResolution = Math.min(...resolutions);
    const maxResolution = Math.max(...resolutions);

    const layerStyle = (feature, resolution) => {
      let styles = [];
      layer.features.forEach(featureConfig => {
        const { filter, style } = this.toOlFeature(featureConfig);
        if (this.evaluateFilter(filter, feature.getProperties())) {
          const featureStyles = style.map(styleName => olStyles[styleName]);
          styles = styles.concat(featureStyles);
        }
      });
      return this.flattenStyles(styles);
    };

    const flatStyle = this.createFlatStyle(layer, olStyles);

    const vtSourceUrl = `${layer.SHPSource}/{z}/{x}/{y}.pbf`;
    const styledLayers = createStyledLayers(vtSourceUrl, [layerStyle, flatStyle]);

    styledLayers.forEach(styledLayer => {
      styledLayer.setMinResolution(minResolution);
      styledLayer.setMaxResolution(maxResolution);
      styledLayer.set('name', layer.Name);
      styledLayer.set('category', layer.Category);
    });

    return styledLayers.length === 1 ? styledLayers[0] : new LayerGroup({
      layers: styledLayers,
      properties: { name: layer.Name, category: layer.Category }
    });
  }

  // ... 기존의 다른 메서드들 ...
}
