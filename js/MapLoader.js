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

const styleUrl = "path/to/STYLE.xml";
const layerUrl = "path/to/LAYER.xml";

const mapLoader = new MapLoader();

(async () => {
  try {
    // Load the map
    await mapLoader.loadMap(styleUrl, layerUrl);

    // Assuming you have an OpenLayers map object available
    const map = new ol.Map({
      // Your map configuration
    });

    // Apply the loaded map to the OpenLayers map
    mapLoader.applyMap(map);
  } catch (error) {
    console.error("Error loading and applying map:", error);
  }
})();

//////////////////////
///////////////////////
// MapStyler 인터페이스 정의
class MapStyler {
    applyMap(map, styleData, layerData) {
        throw new Error("applyMap 메서드는 구현되어야 합니다.");
    }
}
/*
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
*/
// OlMapStyler 클래스가 MapStyler를 구현
class OlMapStyler extends MapStyler {
    applyMap(map, styleData, layerData) {
        // 스타일 적용
        const styles = this.createOlStyles(styleData);

        // 레이어 생성 및 맵에 추가
        const layers = this.createStyledLayer(layerData, styles);
        layers.forEach(layer => map.addLayer(layer));
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

// 맵을 빌드하고 적용하는 클래스
class MapBuilder {
    constructor(styler) {
        this.styler = styler;  // 스타일링 및 레이어 처리 객체 주입
    }

    async loadMap({ styleUrl, layerUrl }) {
        // 각각의 XML 데이터를 URL로부터 비동기적으로 로드하고 JSON으로 변환
        const styleXmlData = await this.fetchXML(styleUrl);
        const layerXmlData = await this.fetchXML(layerUrl);

        // 스타일과 레이어 데이터를 하나의 객체로 묶어서 반환
        const styleJsonData = this.parseXML(styleXmlData);
        const layerJsonData = this.parseXML(layerXmlData);

        return { styleData: styleJsonData, layerData: layerJsonData };
    }

    async applyMap(map, { styleUrl, layerUrl }) {
        // 1. XML 데이터를 URL로부터 비동기적으로 로드하고 하나의 객체로 묶기
        const mapData = await this.loadMap({ styleUrl, layerUrl });

        // 2. 스타일 및 레이어 적용
        this.styler.applyMap(map, mapData.styleData, mapData.layerData); // 객체에서 각각의 데이터 추출하여 넘김
    }

    async fetchXML(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();  // XML 문자열로 반환
    }

    parseXML(xmlData) {
        // XML을 JSON으로 변환하는 로직
        return jsonToXML(xmlData);  // XML을 파싱하여 JSON 형식으로 반환
    }
}

import MapLayerBuilder from './mapLayerBuilder.js';
import OlMapStyler from './olMapStyler.js';
const mapBuilder = new MapBuilder(new OlMapStyler());

// 직접 URL 객체를 전달하여 스타일과 레이어를 적용
mapBuilder.applyMap(map, {
    styleUrl: 'https://example.com/path/to/style.xml',
    layerUrl: 'https://example.com/path/to/layer.xml'
});




