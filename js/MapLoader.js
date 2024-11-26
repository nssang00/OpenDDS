
function buildStyledOlLayers(styleObj, layersObj, urlTemplate) {
  return layersObj.map(layerObj => {
    if (layerObj.layers) {
      // 그룹 레이어 처리
      return new LayerGroup({
        layers: buildStyledOlLayers(styleObj, layerObj.layers, urlTemplate)
      });
    }

    const sourceId = layerObj.SHPSource; // SHPSource -> sourceId로 변경
    const layerSource = getOrCreateLayerSource(sourceId, urlTemplate); // 소스 생성 또는 캐싱된 소스 가져오기

    const styledLayerData = []; // name, style, source를 포함하는 데이터 구조

    for (const rule of layerObj.rules) {
      for (const styleName of rule.styleNames) {
        const styles = [].concat(styleObj[styleName]); // 항상 배열로 변환

        for (const style of styles) {
          styledLayerData.push({
            name: rule.name, // 개별 rule의 이름
            style: {
              ...style,
              filter: rule.filter // 스타일에 필터 추가
            },
            source: layerSource // 소스 포함
          });
        }
      }
    }

    const styledLayers = createStyledLayers(styledLayerData);

    return styledLayers.length === 1
      ? styledLayers[0]
      : new LayerGroup({ layers: styledLayers });
  });
}

function createStyledLayers(styledLayerData) {
  return styledLayerData.map(({ name, style, source }) => {
    if (typeof style === 'function') {
      // 함수형 스타일 처리
      return new VectorTileLayer({
        name: name, // 레이어 이름
        source: source,
        style: style
      });
    } else {
      // WebGL 스타일 처리
      return new (class extends VectorTileLayer {
        createRenderer() {
          return new WebGLVectorTileLayerRenderer(this, {
            style: style
          });
        }
      })({
        name: name, // 레이어 이름
        source: source
      });
    }
  });
}

function findLayerWithParentByRuleName(layersObj, targetLayerName, parentLayer = null) {
  for (const layerObj of layersObj) {
    if (layerObj.layers) {
      // 그룹 레이어인 경우 재귀적으로 탐색하고 결과 반환
      return findLayerWithParentByRuleName(layerObj.layers, targetLayerName, layerObj);
    }

    if (layerObj.rules) {
      // rules 배열에서 대상 이름을 검색
      for (const rule of layerObj.rules) {
        if (rule.name === targetLayerName) {
          // 대상 rule을 찾으면 현재 레이어와 상위 레이어 반환
          return { parentLayer, targetLayer: layerObj };
        }
      }
    }
  }

  // 대상 레이어를 찾지 못한 경우 null 반환
  return null;
}

//////////////////

const layerSourceCache = {};

function getOrCreateLayerSource(layerSource, urlTemplate) {
  if (!layerSourceCache[layerSource]) {
    layerSourceCache[layerSource] = new VectorTileSource({
      format: new MVT(),
      url: urlTemplate.replace('{layerSource}', layerSource)
    });
  }
  return layerSourceCache[sourceId];
}

function createStyledLayers({ name, styles, source }) {
  return styles.map(style => {
    if (typeof style === 'function') {
      return new VectorTileLayer({
	name: name,
        source: source,
        style: style
      });
    } else {
      return new (class extends VectorTileLayer {
        createRenderer() {
          return new WebGLVectorTileLayerRenderer(this, {
            style: style
          });
        }
      })({
	name: name,
        source: source
      });
    }
  });
}

function buildStyledOlLayers(styleObj, layersObj, urlTemplate) {
  return layersObj.map(layerObj => {
    if (layerObj.layers) {
      return new LayerGroup({
        layers: buildStyledOlLayers(styleObj, layerObj.layers, urlTemplate)
      });
    }

    const sourceId = layerObj.SHPSource;  // SHPSource -> sourceId로 변경
    
    // Retrieve or create the layerSource with caching
    const layerSource = getOrCreateLayerSource(sourceId, urlTemplate);
    
    const filteredStyles = [];  // 모든 스타일을 모을 배열
/*
	for (const rule of layerObj.rules) {
	  for (const styleName of rule.styleNames) {
	    filteredStyles.push(
	      ...[].concat(styleObj[styleName]).map(style => ({
	        ...style,
	        filter: rule.filter
	      }))
	    );
	  }
	}
*/
    for (const rule of layerObj.rules) {
      for (const styleName of rule.styleNames) {
        const styles = [].concat(styleObj[styleName]);
        for (const style of styles) {  // for...of 방식으로 변경
          filteredStyles.push({
            ...style,       // Original style
            filter: rule.filter  // Add the filter directly
          });
        }
      }
    }

    const styledLayers = createStyledLayers({
	name: styleObj.name,
      styles: filteredStyles,  // 스타일 배열을 넘김
      source: layerSource
    });

    return styledLayers.length === 1 ? styledLayers[0] : new LayerGroup({ layers: styledLayers });
  });
}
////////

function processRulesToOlStyles(rules) {
    if (!rules) {
        return null;
    }

    const compiledRules = {
        canvas: [],  // canvas 관련 규칙 저장
        webgl: []    // webgl 관련 규칙 저장
    };

    for (const rule of rules) {
        if (rule.symbol) {// symbol이 존재하는 경우
            const processedSymbol = processSymbol(rule.symbol); // ol flatStyle 형태로 변경 시도
            if (processedSymbol) {// filter를 적용하여 processedSymbol을 처리
                compiledRules.webgl.push(...processedSymbol.map(style => ({ filter: rule.filter, ...style })));
            } else {// filter 기반의 symbol 스타일 함수로 변환하여 저장
                compiledRules.canvas.push(rule);
            }
        } else if (rule.style) {
            compiledRules.webgl.push({ filter: rule.filter, ...rule.style });
        }
    }

    // compiledRules의 canvas와 webgl 배열을 배열로 반환
    return [
        ...(compiledRules.canvas.length ? [rulesToStyleFunction(compiledRules.canvas)] : []),
        ...(compiledRules.webgl.length ? [compiledRules.webgl] : [])
    ];
}

/////////

function scaleToResolution(scale, dpi = 96) {
  const inchesPerMeter = 1000 / 25.4;
  return scale / (dpi * inchesPerMeter);
}

// 25k (1:25,000)의 경우
const scale = 25000;
const resolution = scaleToResolution(scale);
// 축척별 scale map
const scaleMap = {
  "25K": 25000,
  "50K": 50000,
  "100K": 100000,
  "250K": 250000,
  "500K": 500000,
  "1M": 1000000
};

// EPSG:3857 해상도 계산
const resolutionMap3857 = {};
Object.keys(scaleMap).forEach((key) => {
  const scale = scaleMap[key];
  resolutionMap3857[key] = scale / (dpi * inchesPerMeter);
});



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

class WebGLVectorTileLayerRenderer {
  constructor(layer, options) {
    this.layer = layer;    // 레이어 저장
    this.style = options.style;    // 스타일 저장
  }
}

class VectorTileLayer {
  constructor(options) {
    this.source = options.source;    // 소스 저장
    this.style = options.style;      // 스타일 저장
  }

  createRenderer() {
    // WebGLVectorTileLayerRenderer를 생성해 반환
    return new WebGLVectorTileLayerRenderer(this, {
      style: this.style
    });
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


const styleObj = {
	"AL015A08": [
		{
		"style": {
			"fill-color": [255,255,255,0],
			"stroke-pattern-src": "No_Fish.png",
			"stroke-width": null,
			"stroke-pattern-start-offset": null,
			"stroke-pattern-spacing": null
		}
		}
	],
	"AL015A05": [
		{
		"style": {
			"fill-pattern-src": "aaa.png",
			"stroke-pattern-src": "No_Fish.png",
			"stroke-width": null,
			"stroke-pattern-start-offset": null,
			"stroke-pattern-spacing": null
		},
		"symbol": {
			"type": "polygon",
			"polygon-picture-texture-fill": true
		}
		}
	]
};

const layersObj = [
  {
    "name": "암초",
    "source": "PBD130",
    "rules": [
      {
        "styleNames": ["BD130P01"],
        "filter": [
          "all",
          ["<=", ["resolution"], 611.49622628141],
          [">", ["resolution"], 152.8740565703525],
          ["in", ["get", "VRR"], [0, 1, 8]]
        ]
      },
      {
        "styleNames": ["BD130P02"],
        "filter": [
          "all",
          ["<=", ["resolution"], 611.49622628141],
          [">", ["resolution"], 152.8740565703525],
          ["in", ["get", "VRR"], [2, 4]]
        ]
      }
    ]
  }
];
/////////////////
import { MapStyler } from './mapLayerBuilder.js';

// OlMapStyler 정의
class OlMapStyler extends MapStyler {
  applyMap(map, { styles, layers }) {
    console.log("Applying OpenLayers styles and layers", styles, layers);
    // OpenLayers 스타일과 레이어를 맵에 적용하는 로직 구현
  }
}

export default OlMapStyler;

///////////


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
