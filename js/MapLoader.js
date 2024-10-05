class LayerGroup {
  constructor(options = {}) {
    this.layers = options.layers || []; // 레이어 그룹을 초기화
  }

  addLayer(layer) {
    this.layers.push(layer); // 레이어 추가
  }

  getLayers() {
    return this.layers; // 레이어 목록 반환
  }
}

class MapStyler {
  applyMap(map) {
    throw new Error("applyMap method must be implemented");
  }
  buildMapLayer(layersObj) {
    throw new Error("buildMapLayer method must be implemented");
  }
  buildMapStyle(compiledStyles) {
    throw new Error("buildMapStyle method must be implemented");
  }
}

class OlMapStyler extends MapStyler {
  buildMapLayer(layerObj) {
    if (layerObj.layers) {
      return new LayerGroup({
        layers: layerObj.layers.map((subLayer) => {
          return createStyledLayers(subLayer.source, subLayer.rules.map(rule => rule.styleNames));
        })
      });
    } else {
      return createStyledLayers(layerObj.source, layerObj.rules.map(rule => rule.styleNames));
    }
  }
createOlLayers(layersObj) {
  return layersObj.map(layerObj => {
    if (layerObj.layers) {
      return new LayerGroup({
        layers: this.createOlLayers(layerObj.layers)
      });
    }
    return createStyledLayers(layerObj.source, layerObj.rules.map(rule => rule.styleNames));
  });
}
  /*
createOlLayers(layersObj) {
  return layersObj.map(layerObj => {
    if (!layerObj.layers) {
      return createStyledLayers(layerObj.source, layerObj.rules.map(rule => rule.styleNames));
    }
    return new LayerGroup({
      layers: this.createOlLayers(layerObj.layers) 
    });
  });
}
*/

applyMap(map, jsonConfig) {
  for (const layerConfig of jsonConfig) {
    const layers = this.buildMapLayer(layerConfig);
    map.addLayer(layers);
  }
}  

  buildMapStyle(compiledStyles) {
    // Implement your logic to build map styles
  }
}


export default class MapLoader {
  constructor() {
    this.parsedStyles = null;
    this.parsedLayers = null;
    this.olStyles = null;
  }

  async loadMap(styleUrl, layerUrl) {
    try {
      const urls = [styleUrl, layerUrl];
      const responses = await Promise.all(urls.map(url => fetch(url)));

      if (!responses[0].ok || !responses[1].ok) {
          throw new Error('Failed to fetch one or both files');
      }

      // styleText와 layerText를 Promise.all을 사용하여 병렬로 처리
      const [styleXmlString, layerXmlString] = await Promise.all(responses.map(response => response.text()));

      this.parseMap(styleXmlString, layerXmlString);

    } catch (error) {
      console.error('Error loading map:', error);
    }
  }

  parseMap(styleXmlString, layerXmlString) {
    this.parsedStyles = this.parseMapStyle(styleXmlString);
    this.parsedLayers = this.parseMapLayer(layerXmlString);
  }
      
  applyMap(map) {
    if (!this.parsedStyles || !this.parsedLayers) {
      throw new Error("Map data has not been loaded. Call loadMap first.");
    }
    this.olStyles = processMapStyle(this.parsedStyles);

    // 레이어 데이터 처리
    for (const layer of this.parsedLayers) {
        const { source, styles } = processLayer(layer);
        const vectorLayers = createStyledLayers(source, styles);
        for (const layer of vectorLayers) {
            map.addLayer(layer);
        }
    }
      
  }

  processLayer(layer) {

    return { source, styles }; 
  }    

  parseMapStyle(xmlText) {
    const xmlDoc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const styleElements = xmlDoc.getElementsByTagName('style');
    const styles = [];

    return styles;
  }

  parseMapLayer(xmlText) {
      const xmlDoc = new DOMParser().parseFromString(xmlText, 'application/xml');
      const layerElements = xmlDoc.getElementsByTagName('layer');
      const layers = [];

      return layers;
  }  
    
}

function createStyledLayers(vtSourceUrl, stylesArray) {
  const vectorTileSource = new VectorTileSource({
    format: new MVT(),
    url: vtSourceUrl
  });

  return stylesArray.map((style) => {
    if (typeof style === 'function') {
      // If the style is a function, create a Canvas-based VectorTileLayer
      return new VectorTileLayer({
        source: vectorTileSource,
        style: style, 
      });
    } else {//useWebGL
      // If the style is not a function, create a WebGL-based VectorTileLayer
      return new (class extends VectorTileLayer {
        createRenderer() {
          return new WebGLVectorTileLayerRenderer(this, {
            style: style // flat styles
          });
        }
      })({
        source: vectorTileSource,
      });
    }
  });
}


// OlMapStyler 클래스가 MapStyler를 구현
class OlMapStyler extends MapStyler {
    applyMap(map, styleData, layerData) {
        // 스타일 적용
        const styles = this.createOlStyles(styleData);

        // 레이어 생성 및 맵에 추가
        const layers = this.createStyledLayer(layerData, styles);
        layers.forEach(layer => map.addLayer(layer));
    }

    applyMap(map) {
    if (!this.parsedStyles || !this.parsedLayers) {
      throw new Error("Map data has not been loaded. Call loadMap first.");
    }
    this.olStyles = processMapStyle(this.parsedStyles);

    // 레이어 데이터 처리
    for (const layer of this.parsedLayers) {
        const { source, styles } = processLayer(layer);
        const vectorLayers = createStyledLayers(source, styles);
        for (const layer of vectorLayers) {
            map.addLayer(layer);
        }
    }
      
  }

    createStyledLayer(layerData, styles) {
        // JSON 데이터를 바탕으로 레이어 생성
        return layerData.map(data => new ol.layer.Vector({
            source: new ol.source.Vector({ ... }),
            style: new ol.style.Style({ ... })
        }));
    }

    createOlStyles(styleData) {
        // 스타일 데이터를 바탕으로 OpenLayers 스타일 생성
        // ... 스타일 생성 로직 ...
    }
}


import MapLayerBuilder from './mapLayerBuilder.js';
import OlMapStyler from './olMapStyler.js';
const mapBuilder = new MapBuilder(new OlMapStyler());


(async () => {
    try {
        await mapBuilder.applyMap(map, {
            styleUrl: 'https://example.com/path/to/style.xml',
            layerUrl: 'https://example.com/path/to/layer.xml'
        });
        // applyMap 완료 후 수행할 코드
    } catch (error) {
        console.error('Error applying map:', error);
    }
})();

