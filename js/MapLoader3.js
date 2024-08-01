class MapLoader {
  constructor() {
    // 필요한 초기화가 있다면 여기에 추가할 수 있습니다.
  }

  toRGBAArray(rgbaString) {
    const [a, r, g, b] = rgbaString.split(',').map(Number);
    return [r, g, b, Number(parseFloat(a/255).toFixed(2))];
  }

  parseMapStyle(xmlString) {
    const xmlDoc = new DOMParser().parseFromString(xmlString, "text/xml");

    let styles = [];
    for (const styleNode of xmlDoc.documentElement.children) {
      styles.push(this.parseStyleNode(styleNode));
    }
    return styles;
  }

  parseStyleNode(node) {
    const nodeObj = {};
    for (const attr of node.attributes) {
      nodeObj[attr.name] = attr.value;
    }

    let children = [];
    for (let child of node.children) {
      if(['PointLayer', 'LineLayer', 'PolygonLayer'].includes(child.tagName)) {
        children.push(this.parseStyleNode(child));
      } else {
        if (child.children.length === 0) {
          nodeObj[child.tagName] = child.textContent;
        } else {
          nodeObj[child.tagName] = [];
          for (const item of child.children) {
            nodeObj[child.tagName].push(item.textContent);
          }
        }
      }
    }

    if (children.length > 0) {
      nodeObj.symbolizers = children;
    }

    return nodeObj;
  }

  parseMapLayer(xmlString) {
    const xmlDoc = new DOMParser().parseFromString(xmlString, "text/xml");

    const layers = [];
    for (const child of xmlDoc.documentElement.children) {
      layers.push(this.parseLayerNode(child));
    }
    return layers;
  }

  parseLayerNode(node) {
    const nodeObj = {type: node.tagName};
    for (const attr of node.attributes) {
      nodeObj[attr.name] = attr.value;
    }
    
    let children = [];
    for (let child of node.children) {
      if(child.children.length > 0) {
        children.push(this.parseLayerNode(child));
      } else {
        const childObj = {};
        for(const attr of child.attributes) {
          childObj[attr.name] = attr.value;
        }
        nodeObj[child.tagName] = childObj;        
      }
    }

    if (children.length > 0) {
      nodeObj[node.tagName === "Layer" ? "features" : "layers"] = children;
    }
    return nodeObj;
  }

  toOlStyle(stylesObj) {
    const olStyleFunctionMap = {
      point: this.toOlPointStyle.bind(this),
      line: this.toOlLineStyle.bind(this),
      polygon: this.toOlPolygonStyle.bind(this),
      Label: this.toOlLabelStyle.bind(this)
    };

    const olStyles = {};
    for (const styleObj of stylesObj) {
      const olStyleFunction = olStyleFunctionMap[styleObj.type];
      if (olStyleFunction) {
        olStyles[styleObj.name] = olStyleFunction(styleObj);
      }
    }
    return olStyles;
  }

  toOlPointStyle(pointStyleObj) {
    const offset = [Number(pointStyleObj.OffsetX), Number(pointStyleObj.OffsetY)];    
    for(const symbolizer of pointStyleObj.symbolizers) {
      switch (symbolizer.type) {
        case "SIMPLE":
          if(symbolizer.Shape === "0") {
            return {
              style: {
                'circle-radius': symbolizer.Size,
                'circle-fill-color': this.toRGBAArray(symbolizer.Color),
                'circle-displacement': offset,
              }
            };
          } else if(symbolizer.Shape === "1") {
            return {
              style: {
                'shape-points': 4,
                'shape-radius': symbolizer.Size,
                'shape-fill-color': this.toRGBAArray(symbolizer.Color),
                'shape-displacement': offset,
                'shape-angle': Math.PI / 4,
              }
            };
          }
          break;
        case "PICTURE":
          return {
            style: {
              'icon-src': symbolizer.Picture,
              'icon-displacement': offset,
            }
          };
        default:
          break;
      }
    }
  }

  toOlLineStyle(lineStyleObj) {
    return lineStyleObj.symbolizers.map(symbolizer => this.toOlLineSymbolizer(symbolizer));
  }

  toOlLineSymbolizer(symbolizer) {
    const lineJoins = ['miter', 'bevel', 'round'];
    const lineCaps = ['butt', 'square', 'round'];

    let olSymbolizer;
    switch (symbolizer.type) {
      case "SIMPLE":        
        olSymbolizer = {
          style: {
            'stroke-color': this.toRGBAArray(symbolizer.Color),
            'stroke-width': symbolizer.Width,
            'stroke-line-join': lineJoins[Number(symbolizer.JoinType)],
            'stroke-line-cap': lineCaps[Number(symbolizer.StartCap)],
          }
        };          
        break;
      case "DASH":
        olSymbolizer = {
          style: {
            'stroke-color': this.toRGBAArray(symbolizer.Color),
            'stroke-width': symbolizer.Width,
            'stroke-line-join': lineJoins[Number(symbolizer.JoinType)],
            'stroke-line-cap': lineCaps[Number(symbolizer.StartCap)],
            'stroke-line-dash-offset': symbolizer.DashOffset,
            'stroke-line-dash': symbolizer.Dash.map(Number),
          }
        };      
        break;
      case "PICTURE":
        if(symbolizer.TextureLine === "false") {
          olSymbolizer = {
            symbol: {
              'type': 'picture',
              'picture-texture-line': false,
            },
            style: {
              'stroke-pattern-src': symbolizer.Picture,
              'stroke-width': Number(symbolizer.Width),
              'stroke-pattern-start-offset': Number(symbolizer.StartPos),
              'stroke-pattern-spacing': Number(symbolizer.Interval),
            }
          };        
        } else if(symbolizer.TextureLine === "true") {
          olSymbolizer = {
            symbol: {
              'type': 'picture',
              'picture-texture-line': true,
            },
            style: {
              'stroke-pattern-src': symbolizer.Picture,
              'stroke-width': Number(symbolizer.Width),
              'stroke-line-join': lineJoins[Number(symbolizer.JoinType)],
              'stroke-line-cap': lineCaps[Number(symbolizer.StartCap)],
            }
          };     
        }
        break;
      case "VERTICAL":
        olSymbolizer = {
          symbol: {
            'type': 'vertical',
            'vertical-color': `rgba(${this.toRGBAArray(symbolizer.Color).join(', ')})`,
            'vertical-width': Number(symbolizer.Width),
            'vertical-vertical-type': Number(symbolizer.VerticalType),
            'vertical-left-length': Number(symbolizer.leftLength),
            'vertical-right-length': Number(symbolizer.rightLength),
            'vertical-line-cap': Number(symbolizer?.StartCap),
            'vertical-start-pos': Number(symbolizer?.StartPos),
            'vertical-interval': Number(symbolizer?.Interval),        
          },                        
        };              
        break;         
      case "DOUBLELINE":
        olSymbolizer = {
          symbol: {
            'type': 'double-line',
            'double-line-color': this.toRGBAArray(symbolizer.Color),
            'double-line-width': Number(symbolizer.Width),
            'double-line-type': Number(symbolizer.Type),
            'double-line-space': Number(symbolizer.Space),
            'double-line-line-join': lineJoins[Number(symbolizer.JoinType)],
          },  
        };            
        break;                 
      default:
        break;
    }
    return olSymbolizer;
  }

  toOlPolygonStyle(polygonStyleObj) {
    return polygonStyleObj.symbolizers.map(symbolizer => {
      const olPolygonStyleObj = { style: {} };

      if (symbolizer.type === "SIMPLE") {
        const rgba = this.toRGBAArray(symbolizer.Color);
        rgba[3] = symbolizer.Transparent === "true" ? 0 : rgba[3];
        olPolygonStyleObj.style = {
          'fill-color': rgba,
        }
      } else if (symbolizer.type === "PICTURE") {
        olPolygonStyleObj.symbol = {
          'type': 'polygon',
          'polygon-picture-texture-fill': Boolean(symbolizer.TextureFill),
        };    
        olPolygonStyleObj.style = {
          'fill-pattern-src': symbolizer.Picture,
        }        
      }
      Object.assign(olPolygonStyleObj.style, this.toOlLineSymbolizer(symbolizer.symbolizers[0]).style);
      return olPolygonStyleObj;
    });
  }

  toOlLabelStyle(labelStyleObj) {
    const font = labelStyleObj.Font;
    const size = Number(labelStyleObj.Size);
    const offsetX = Number(labelStyleObj.OffsetX);
    const offsetY = Number(labelStyleObj.OffsetY);
    const bold = Boolean(labelStyleObj.Bold);
    const italic = Boolean(labelStyleObj.Italic);
    const underline = Boolean(labelStyleObj.Underline)
    const textAlign = Number(labelStyleObj.Align);
    const textAligns = [
      ['left', 'top'],    ['center', 'top'],    ['right', 'top'],
      ['left', 'middle'], ['center', 'middle'], ['right', 'middle'],
      ['left', 'bottom'], ['center', 'bottom'], ['right', 'bottom'],
    ];

    const anchors = [
      [1, 1],   [0.5, 1],   [0, 1],
      [1, 0.5], [0.5, 0.5], [0.5, 0.5],
      [1, 0],   [0.5, 0],   [0, 0],
    ];    

    const align = textAligns[textAlign][0];
    const baseline = textAligns[textAlign][1];

    const olLabelStyleObj = {
      symbol: {
        'type': 'label',
        'label-underline': underline,
        'label-sea-water-level': Boolean(labelStyleObj.SeaWaterLevel),
        'label-decimal': Number(labelStyleObj.Decimal),
        'label-prefix': labelStyleObj.Prefix,
        'label-postfix': labelStyleObj.Postfix,
      },  
      style: {
        'text-value': ['var', 'text'],  
        'text-font': (bold ? 'bold ':'') + (italic ? 'italic ':'') + size + 'px ' + font,
        'text-fill-color': this.toRGBAArray(labelStyleObj.Color),
        'text-align': align,
        'text-baseline': baseline,
        'text-offset-x': offsetX,
        'text-offset-y': offsetY,
      }
    }

    if(Boolean(labelStyleObj.Outline)) {    
      olLabelStyleObj.style['text-stroke-color'] = this.toRGBAArray(labelStyleObj.OutlineColor);
    }

    if(Boolean(labelStyleObj.Box)) {    
      olLabelStyleObj.style['text-background-fill-color'] = this.toRGBAArray(labelStyleObj.BoxColor);
    }

    const picture = labelStyleObj?.Picture;
    if(picture) {
      olLabelStyleObj.style['icon-src'] = picture;
      olLabelStyleObj.style['icon-displacement'] = [Number(labelStyleObj.ImageOffsetX), Number(labelStyleObj.ImageOffsetY)];  
      olLabelStyleObj.style['icon-anchor'] = anchors[Number(labelStyleObj.ImageAlign)];
    }

    return olLabelStyleObj;
  }

  toOlMapLayer(layersObj) {
    const olLayers = {};
    for (const layerObj of layersObj) {
      olLayers[layerObj.Name] = layerObj.type === "Layer" 
              ? this.toOlLayer(layerObj)
              : this.toOlMapLayer(layerObj.layers);
    }
    return olLayers;
  }

  toOlLayer(layerObj) {
    const scaleMap = {
      "25K": 9.554628535647032,
      "50K": 19.109257071294063,
      "100K": 38.21851414258813,
      "250K": 152.8740565703525,
      "500K": 305.748113140705,
      "1M": 611.49622628141
    };

    const resolutions = layerObj.Map.split(',').map(v => scaleMap[v.trim()]);

    const olFilters = [
      'all',
      ['<=', ['resolution'], Math.max(...resolutions)],     
      ['>', ['resolution'], Math.min(...resolutions)], 
    ];

    const olStyles = {};
    for (const featureObj of layerObj.features) {
      const {styles, filters} = this.toOlFeature(featureObj);
      olFilters.push(...filters);
    }    

    return {
      source : layerObj.SHPSource,
      filters: olFilters,
      styles: olStyles
    }
  }

  toOlFeature(featureObj) {
    const styles = [featureObj.GeometryStyle, featureObj.LabelStyle].filter(Boolean);

    const filters = [];
    for (const prop in featureObj.VVTStyle) {
      const [, operator, valuesPart] = featureObj.VVTStyle[prop]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<>/g, '!')
        .match(/([<>=!]+)?([\w+,]+)/);

      if(valuesPart.includes(',')) {
        const values = valuesPart.split(',').map(value => isNaN(Number(value)) ? value : Number(value));
        const filter = ['in', ['get', prop], isNaN(values[0]) ? ['literal', values] : values];
        filters.push(operator === '!' ? ['!', filter]: filter);
      } else {
        const finalOperator = !operator ? '==' : operator ==='!' ? '!=' : operator;
        filters.push([finalOperator, ['get', prop], Number(valuesPart)]);
      }
    }

    return {
      styles,
      filters,
    };
  }
}
