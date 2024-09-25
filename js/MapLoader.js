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

class MapStyler {
  parseMapStyle(xmlText) {
    throw new Error("parseMapStyle must be implemented by strategy");
  }

  parseMapLayer(xmlText) {
    throw new Error("parseMapLayer must be implemented by strategy");
  }

  applyMap(map, styles, layers) {
    throw new Error("applyMap must be implemented by strategy");
  }
}

/////////////////
[
  {
    "name": "해안선",
    "source": "LBA010",
    "rules": [
      {
        "styleNames": [
          "BA010L01"
        ],
        "filter": [
          "all",
          [
            "<=",
            [
              "resolution"
            ],
            611.49622628141
          ],
          [
            ">",
            [
              "resolution"
            ],
            152.8740565703525
          ],
          [
            "==",
            [
              "get",
              "ACC"
            ],
            0
          ],
          [
            "in",
            [
              "get",
              "SLT"
            ],
            [
              1,
              10,
              11,
              13
            ]
          ]
        ]
      },
      {
        "styleNames": [
          "BA010L02"
        ],
        "filter": [
          "all",
          [
            "<=",
            [
              "resolution"
            ],
            611.49622628141
          ],
          [
            ">",
            [
              "resolution"
            ],
            152.8740565703525
          ],
          [
            "==",
            [
              "get",
              "ACC"
            ],
            0
          ],
          [
            "in",
            [
              "get",
              "SLT"
            ],
            [
              2,
              10,
              11,
              13
            ]
          ]
        ]
      }
    ]
  },
  {
    "name": "표고점",
    "source": "PCA010",
    "rules": [
      {
        "styleNames": [
          "CA030P01",
          "CA030T01"
        ],
        "filter": [
          "all",
          [
            "<=",
            [
              "resolution"
            ],
            611.49622628141
          ],
          [
            ">",
            [
              "resolution"
            ],
            152.8740565703525
          ],
          [
            "==",
            [
              "get",
              "ACC"
            ],
            1
          ],
          [
            "in",
            [
              "get",
              "ELA"
            ],
            [
              0,
              2
            ]
          ]
        ]
      },
      {
        "styleNames": [
          "CA030P01",
          "CA030T02"
        ],
        "filter": [
          "all",
          [
            "<=",
            [
              "resolution"
            ],
            611.49622628141
          ],
          [
            ">",
            [
              "resolution"
            ],
            152.8740565703525
          ],
          [
            "==",
            [
              "get",
              "ACC"
            ],
            1
          ],
          [
            "in",
            [
              "get",
              "ELA"
            ],
            [
              0,
              2
            ]
          ]
        ]
      }
    ]
  },
  {
    "name": "간석지",
    "layers": [
      {
        "name": "암초",
        "source": "PBD130",
        "rules": [
          {
            "styleNames": [
              "BD130P01"
            ],
            "filter": [
              "all",
              [
                "<=",
                [
                  "resolution"
                ],
                611.49622628141
              ],
              [
                ">",
                [
                  "resolution"
                ],
                152.8740565703525
              ],
              [
                "in",
                [
                  "get",
                  "VRR"
                ],
                [
                  0,
                  1,
                  8
                ]
              ]
            ]
          },
          {
            "styleNames": [
              "BD130P02"
            ],
            "filter": [
              "all",
              [
                "<=",
                [
                  "resolution"
                ],
                611.49622628141
              ],
              [
                ">",
                [
                  "resolution"
                ],
                152.8740565703525
              ],
              [
                "in",
                [
                  "get",
                  "VRR"
                ],
                [
                  2,
                  4
                ]
              ]
            ]
          }
        ]
      }
    ]
  }
]


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


// ... existing code ...

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
      if (Array.isArray(layers)) {
        for (const layer of layers) {
          map.addLayer(layer);
        }
      } else {
        map.addLayer(layers);
      }
    }
  }

  buildMapStyle(compiledStyles) {
    // Implement your logic to build map styles
  }
}

// Usage example
const mapStyler = new OlMapStyler();
mapStyler.applyMap(map, jsonConfig);

////////////

class OlMapStyler extends MapStyler {
    constructor() {
        super();
        this.styles = [];
        this.layers = [];
    }

    setStyles(styles) {
        this.styles = this.convertToOlStyles(styles);
    }

    setLayers(layers) {
        this.layers = this.convertToOlLayers(layers);
    }

    applyMap(map) {
        this.layers.forEach(layer => {
            map.addLayer(layer); // Add each layer to the map
        });
    }

    convertToOlStyles(styles) {
        return styles.map(style => {
            return new ol.style.Style({
                fill: new ol.style.Fill({
                    color: style.fillColor || 'rgba(255,255,255,0.4)'
                }),
                stroke: new ol.style.Stroke({
                    color: style.strokeColor || '#3399CC',
                    width: style.strokeWidth || 2
                })
            });
        });
    }

    convertToOlLayers(layers) {
        return layers.map(layer => {
            return new ol.layer.Vector({
                source: new ol.source.Vector({
                    url: layer.sourceUrl,
                    format: new ol.format.GeoJSON()
                }),
                style: this.getStyleByName(layer.styleName)
            });
        });
    }

    getStyleByName(styleName) {
        return this.styles.find(style => style.get('name') === styleName) || null;
    }
}
/////////

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
