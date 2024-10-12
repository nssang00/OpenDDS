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
function createStyledLayers(vectorTileSource, styles) {
  if (typeof styles === 'function') {
    // 스타일이 함수인 경우, Canvas 기반 VectorTileLayer를 생성
    return new VectorTileLayer({
      source: vectorTileSource,
      style: styles,
    });
  } else {
    // 스타일이 객체인 경우, WebGL 기반 VectorTileLayer를 생성
    return new (class extends VectorTileLayer {
      createRenderer() {
        return new WebGLVectorTileLayerRenderer(this, {
          style: styles // flat styles
        });
      }
    })({
      source: vectorTileSource,
    });
  }
}

function createOlLayers(styleObj, layersObj) {
  return layersObj.map(layerObj => {
    if (layerObj.layers) {
      // 그룹인 경우, LayerGroup을 생성
      return new LayerGroup({
        layers: createOlLayers(layerObj.layers) // 재귀적으로 하위 레이어 처리
      });
    }

    // 벡터 타일 소스 생성
    const vectorTileSource = new VectorTileSource({
      format: new MVT(),
      url: `https://api.maptiler.com/tiles/${layerObj.source}/{z}/{x}/{y}.pbf`
    });

    // 스타일 이름을 스타일 객체로 매핑
    const styles = layerObj.rules.map(rule =>
      rule.styleNames.map(styleName => styleObj[styleName])
    );

    //const styledLayers = createStyledLayers(vtSourceUrl, [canvasStyle, webGLStyle]);
    return createStyledLayers(vectorTileSource, styles);

  });
}

function createStyledOlLayers(styleObj, layersObj) {
  return layersObj.map(layerObj => {
    if (layerObj.layers) {
      // 그룹인 경우, LayerGroup을 생성
      return new LayerGroup({
        layers: createOlLayers(layerObj.layers) // 재귀적으로 하위 레이어 처리
      });
    }

    const vectorTileSource = new VectorTileSource({
      format: new MVT(),
      url: layerObj.source // 레이어마다 개별 소스를 사용
    });

    const styles = layerObj.rules.map(rule =>
      rule.styleNames.map(styleName => styleObj[styleName])
    );

    if (typeof styles === 'function') {// 스타일이 함수인 경우, Canvas 기반 VectorTileLayer를 생성
      return new VectorTileLayer({
        source: vectorTileSource,
        style: styles,
      });
    } else {
      return new (class extends VectorTileLayer {      // 스타일이 객체인 경우, WebGL 기반 VectorTileLayer를 생성
        createRenderer() {
          return new WebGLVectorTileLayerRenderer(this, {
            style: styles // flat styles
          });
        }
      })({
        source: vectorTileSource,
      });
    }
  });
}

  

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


// OlMapStyler 클래스가 MapStyler를 구현
class OlMapStyler extends MapStyler {
    applyMap(map, styleData, layerData) {
        // 스타일 적용
        const styles = this.createOlStyles(styleData);
        //processMapStyle, toOlMapStyle

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
