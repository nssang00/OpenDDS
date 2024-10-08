
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

import LayerGroup from 'ol/layer/Group';
import VectorTileSource from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';
import { createStyledLayers } from './yourUtilFile'; // createStyledLayers 함수가 정의된 파일을 임포트

class MapLoader {
  constructor() {
    this.parsedStyles = null;
    this.parsedLayers = null;
    this.olStyles = null;
  }

  // ... loadMap, parseMap 등의 기존 메서드들 ...

  applyMap(map) {
    if (!this.parsedStyles || !this.parsedLayers) {
      throw new Error("Map data has not been loaded. Call loadMap first.");
    }
    this.olStyles = this.processMapStyle(this.parsedStyles);
    
    for (const layer of this.parsedLayers) {
      const processedLayer = this.processLayer(layer, map);
      if (processedLayer) {
        map.addLayer(processedLayer);
      }
    }
  }

  processLayer(layer, map) {
    if (layer.type === 'Layer') {
      return this.createVectorTileLayer(layer);
    } else if (layer.type === 'Group') {
      return this.createLayerGroup(layer, map);
    }
  }

  createLayerGroup(groupLayer, map) {
    const layers = groupLayer.layers
      .map(subLayer => this.processLayer(subLayer, map))
      .filter(Boolean);
    
    return new LayerGroup({
      layers: layers,
      properties: { name: groupLayer.Name, category: groupLayer.Category }
    });
  }

  createLayerStyles(layer) {
    const canvasStyle = (feature, resolution) => {
      for (const featureConfig of layer.features) {
        if (this.matchesFilter(feature, featureConfig.VVTStyle)) {
          return this.combineStyles(featureConfig.GeometryStyle, featureConfig.LabelStyle);
        }
      }
      return null;
    };

    const webGLStyle = this.createFlatStyle(layer);

    return [canvasStyle, webGLStyle];
  }

  
  

  
