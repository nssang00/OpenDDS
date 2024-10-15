function createStyledOlLayers(styleObj, layersObj) {
  return layersObj.map(layerObj => {
    if (layerObj.layers) {
      // 하위 레이어가 있는 경우, 재귀적으로 LayerGroup 생성
      return new LayerGroup({
        layers: createStyledOlLayers(styleObj, layerObj.layers) // 재귀적으로 하위 레이어 처리
      });
    }

    const vectorTileSource = new VectorTileSource({
      format: new MVT(),
      url: layerObj.source // 각 레이어는 개별 소스를 사용
    });

    return new LayerGroup({
      layers: layerObj.rules.flatMap(rule =>
        rule.styleNames.map(styleName => {
          const style = styleObj[styleName];

          // 스타일이 함수일 경우, Canvas 기반 VectorTileLayer 생성
          if (typeof style === 'function') {
            return new VectorTileLayer({
              source: vectorTileSource,
              style: style
            });
          } else {
            // 스타일이 객체일 경우, WebGL 기반 VectorTileLayer 생성
            return new (class extends VectorTileLayer {
              createRenderer() {
                return new WebGLVectorTileLayerRenderer(this, {
                  style: style // WebGL 스타일 객체 적용
                });
              }
            })({
              source: vectorTileSource
            });
          }
        })
      )
    });
  });
}


/*
function createRulesToOlStyles(rules)
{
    if (!rules) {
        return null;
    }
  
    let compiledRules = [];
    for (const rule of rules) {
        let compiledRule = null;
        if(rule.symbol) {//symbol 이 존재할경우
            const processedSymbol = processSymbol(rule.symbol);// ol flatStyle형태로 변경처리 시도
            if(processedSymbol)//filter처리 
                compiledRule = processedSymbol.map(style => ({filter: rule.filter, ...style}));
            else//filter기반 스타일 함수로 변환시도
                compiledRule = rulesToStyleFunction([rule]);
        }
        else {
            if(rule.style) {//style이 존재할경우 webgl flatstyle은 style 을 복사.
                compiledRule = {filter: rule.filter,...rule.style}
            }
        }
        if(compiledRule !== null)
            compiledRules.push(compiledRule);
    }
  
    return compiledRules;
}
*/
function createRulesToOlStyles(rules) {
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

//[stylefunction, flatStyles]
function createRulesToOlStyles(rules) {
  if(!rules) {
    return null;
  }
  let compiledRules = [];
  for(const rule of rules) {
    let compiledRule = null;
    if(rule.symbol) {//symbol이 존재할 경우
      compiledRule = rulesToStyleFunction([rule]);
    }
    else {
      if(rule.style) {//style이 존재할 경우 webgl flatstyle은 style을 복사.
        compiledRule = {filter: rule.filter, ...rule.style}
      }
      if(compiledRule !=== null)
        compiledRules.push(compiledRule);
    }
    return compiledRules;
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
