<!DOCTYPE html>
<html>
  <head>
    <title>JavaScript Sandbox</title>
    <meta charset="UTF-8" />
  </head>

  <body>
    <div id="app"></div>
    <script>
const xmlMapStyle = `<MapStyle Version="1.0">	
	<Style name="Agg" type="point">
		<OffsetX>0</OffsetX>
		<OffsetY>0</OffsetY>
		<PointLayer type="PICTURE">
			<Picture>ddd.png</Picture>
		</PointLayer>
	</Style>  
	<Style name="Agg2" type="point">
		<OffsetX>0</OffsetX>
		<OffsetY>0</OffsetY>
    <PointLayer type="SIMPLE">
    <Color>255, 0, 99, 198</Color>
    <Size>6</Size>
    <Shape>0</Shape>
		</PointLayer>
	</Style>    
  <Style name="BB010T03" type="Label">
		<Font>굴림</Font>
		<Size>8</Size>
		<Color>255, 97, 17, 146</Color>
		<Bold>false</Bold>
		<Italic>false</Italic>
		<Underline>false</Underline>
		<OffsetX>23</OffsetX>
		<OffsetY>-2</OffsetY>
		<Align>4</Align>
	</Style>

	<Style name="Adfs" type="line">
		<LineLayer type="DASH">
			<Color>255, 0, 0, 0</Color>
			<Width>1</Width>
			<JoinType>2</JoinType>
			<Dash>
				<DashItem>6</DashItem>
				<DashItem>3</DashItem>
				<DashItem>6</DashItem>
				<DashItem>3</DashItem>
			</Dash>
		</LineLayer>
		<LineLayer type="PICTURE">
			<Picture>dfd.png</Picture>
			<TextureLine>false</TextureLine>
			<Width>8</Width>
		</LineLayer>		
	</Style>
	<Style name="AL015A08" type="polygon">
		<PolygonLayer type="SIMPLE">
			<Color>255, 255, 255, 255</Color>
			<Transparent>true</Transparent>
			<LineLayer type="PICTURE">
				<Picture>No_Fish.png</Picture>
				<TextureLine>false</TextureLine>
			</LineLayer>
		</PolygonLayer>
  </Style>
	<Style name="AL015A05" type="polygon">
		<PolygonLayer type="PICTURE">
			<Picture>aaa.png</Picture>
			<TextureFill>true</TextureFill>
			<LineLayer type="PICTURE">
				<Picture>No_Fish.png</Picture>
				<TextureLine>false</TextureLine>
			</LineLayer>
		</PolygonLayer>
  </Style>  
</MapStyle>`;

const xmlMapLayer = `<MapLayer Version="1.0">
	<Layer Category="경계" Name="해안선" FACC="BA010" GeometryType="Line" SHPSource="LBA010" GDBSource="CoastL" Map="250K,500K,1M" DisplayType="Geometry">
		<Feature Name="사구" Description="설명" GeometryStyle="BA010L01">
			<VVTStyle ACC="0" SLT="1,10,11,13"></VVTStyle>
		</Feature>
		<Feature Name="사구" Description="설명" GeometryStyle="BA010L02">
			<VVTStyle ACC="0" SLT="2,10,11,13"></VVTStyle>
		</Feature>
	</Layer>
	<Layer Category="고도" Name="표고점" FACC="CA030" GeometryType="Point" SHPSource="PCA010" GDBSource="ElevP" Map="250K,500K,1M" DisplayType="Both" LabelColumn="ZV2">
		<Feature Name="명확한 표고점" Description="설명" GeometryStyle="CA030P01" LabelStyle="CA030T01">
			<VVTStyle ACC="1" ELA="0,2"></VVTStyle>
		</Feature>
		<Feature Name="명확한 표고점" Description="설명" GeometryStyle="CA030P01" LabelStyle="CA030T02">
			<VVTStyle ACC="1" ELA="0,2"></VVTStyle>
		</Feature>		
	</Layer>
	<Group Category="연안수부지물" Name="간석지" GeometryType="Point">
    <Layer Category="수부" Name="암초" FACC="BD130" GeometryType="Point" SHPSource="PBD130" GDBSource="DangerP" Map="250K,500K,1M" DisplayType="Geometry">
		<Feature Name="수상암초" Description="설명" GeometryStyle="BD130P01">
			<VVTStyle VRR="0,1,8"></VVTStyle>
		</Feature>
		<Feature Name="수중암초" Description="설명" GeometryStyle="BD130P02">
			<VVTStyle VRR="2,4"></VVTStyle>
		</Feature>		
	</Layer>	    
	</Group>  
</MapLayer>`;
class MapLoader {
  constructor(mapStyler) {
    this.parsedStyles = null;
    this.parsedLayers = null;
    this.mapStyler = mapStyler;
    //this.olStyles = null;
  }

  async loadMap(styleUrl, layerUrl) {
    try {
      const urls = [styleUrl, layerUrl];
      const responses = await Promise.all(urls.map(url => fetch(url)));

      if (!responses[0].ok || !responses[1].ok) {
          throw new Error('Failed to fetch one or both files');
      }

      const [styleXmlString, layerXmlString] = await Promise.all(responses.map(response => response.text()));

      this.parseMap(styleXmlString, layerXmlString);

    } catch (error) {
      console.error('Error loading map:', error);
    }
  }

  applyMap() {
	  //this.mapStyler.processMapStyle(this.parsedStyles);
  }

  parseMap(styleXmlString, layerXmlString) {
    this.parsedStyles = this.parseMapStyle(styleXmlString);
    this.parsedLayers = this.parseMapLayer(layerXmlString);
  }

  // RGBA 문자열을 배열로 변환하는 함수
  toRGBAArray(rgbaString) {
    const [a, r, g, b] = rgbaString.split(',').map(Number);
    return [r, g, b, Number(parseFloat(a / 255).toFixed(2))];
  }

  // XML 문자열에서 스타일 정보를 파싱하는 함수
  parseMapStyle(xmlString) {
    const xmlDoc = new DOMParser().parseFromString(xmlString, "application/xml");

    let styles = [];
    for (const styleNode of xmlDoc.documentElement.children) {
      styles.push(this.parseStyleNode(styleNode));
    }
    return styles;
    //return Array.from(xmlDoc.documentElement.children).map(parseStyleNode);
  }

  // 스타일 노드를 파싱하여 객체로 변환하는 함수 (재귀적으로 호출됨)
  parseStyleNode(node) {
    const nodeObj = {};
    for (const attr of node.attributes) {
      nodeObj[attr.name] = attr.value;
    }

    let children = [];
    for (let child of node.children) {
      if (['PointLayer', 'LineLayer', 'PolygonLayer'].includes(child.tagName)) {
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

  // XML 문자열에서 레이어 정보를 파싱하는 함수
  parseMapLayer(xmlString) {
    const xmlDoc = new DOMParser().parseFromString(xmlString, "application/xml");

    const layers = [];
    for (const child of xmlDoc.documentElement.children) {
      layers.push(this.parseLayerNode(child));
    }
    return layers;
    //return Array.from(xmlDoc.documentElement.children).map(parseLayerNode);
  }

  // 레이어 노드를 파싱하여 객체로 변환하는 함수 (재귀적으로 호출됨)
  parseLayerNode(node) {
    const nodeObj = { type: node.tagName };
    for (const attr of node.attributes) {
      nodeObj[attr.name] = attr.value;
    }

    let children = [];
    for (let child of node.children) {
      if (child.children.length > 0) {
        children.push(this.parseLayerNode(child));
      } else {
        const childObj = {};
        for (const attr of child.attributes) {
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

  // 스타일 객체를 OpenLayers 스타일로 변환하는 함수
  toOlMapStyle(stylesObj) {
    const olStyleFunctionMap = {
      point: this.toOlPointStyle,
      line: this.toOlLineStyle,
      polygon: this.toOlPolygonStyle,
      Label: this.toOlLabelStyle
    };

    const olStyles = {};
    for (const styleObj of stylesObj) {
      const olStyleFunction = olStyleFunctionMap[styleObj.type];
      if (olStyleFunction) {
        olStyles[styleObj.name] = olStyleFunction.call(this, styleObj);
      }
    }
    return olStyles;
  }

  // Point 스타일 객체를 OpenLayers 스타일로 변환하는 함수
  toOlPointStyle(pointStyleObj) {
    const offset = [Number(pointStyleObj.OffsetX), Number(pointStyleObj.OffsetY)];
    for (const symbolizer of pointStyleObj.symbolizers) {
      switch (symbolizer.type) {
        case "SIMPLE":
          if (symbolizer.Shape === "0") { // Circle
            return {
              style: {
                'circle-radius': symbolizer.Size,
                'circle-fill-color': this.toRGBAArray(symbolizer.Color),
                'circle-displacement': offset,
              }
            };
          } else if (symbolizer.Shape === "1") { // Rectangle
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
          break;	
        default:
          break;
      }
    }
  }

  // Line 스타일 객체를 OpenLayers 스타일로 변환하는 함수
  toOlLineStyle(lineStyleObj) {
    return lineStyleObj.symbolizers.map(symbolizer => this.toOlLineSymbolizer(symbolizer));
  }

  // Line Symbolizer 객체를 OpenLayers Line 스타일로 변환하는 함수
  toOlLineSymbolizer(symbolizer) {
    const lineJoins = ['miter', 'bevel', 'round'];//JoinType
    const lineCaps = ['butt', 'square', 'round'];//StartCap

    let olSymbolizer;
    switch (symbolizer.type) {
      case "SIMPLE":
        olSymbolizer = {
          style: {
            'stroke-color': this.toRGBAArray(symbolizer.Color),//Color
            'stroke-width': symbolizer.Width,//Width
            'stroke-line-join': lineJoins[Number(symbolizer.JoinType)],//JoinType
            'stroke-line-cap': lineCaps[Number(symbolizer.StartCap)],//StartCap, EndCap
          }
        };
        break;
      case "DASH":
        olSymbolizer = {
          style: {
            'stroke-color': this.toRGBAArray(symbolizer.Color),//Color
            'stroke-width': symbolizer.Width,//Width
            'stroke-line-join': lineJoins[Number(symbolizer.JoinType)],//JoinType
            'stroke-line-cap': lineCaps[Number(symbolizer.StartCap)],//DashCap
            'stroke-line-dash-offset': symbolizer.DashOffset,//DashOffset
            'stroke-line-dash': symbolizer.Dash.map(Number),//Dash, DashItem
          }
        };
        break;
      case "PICTURE":
        if (symbolizer.TextureLine === "false") {
          olSymbolizer = {
            symbol: {
              'type': 'picture',
              'picture-texture-line': false,//TextureLine
            },
            style: {
              'stroke-pattern-src': symbolizer.Picture,//Picture
              'stroke-width': Number(symbolizer.Width),//Width
              'stroke-pattern-start-offset': Number(symbolizer.StartPos),//StartPos
              'stroke-pattern-spacing': Number(symbolizer.Interval),//Interval
            }
          };
        } else if (symbolizer.TextureLine === "true") {//StrokePattern, stylefunction, canvas
          olSymbolizer = {
            symbol: {
              'type': 'picture',
              'picture-texture-line': true,//TextureLine
            },
            style: {
              'stroke-pattern-src': symbolizer.Picture,//Picture
              //'icon-src': symbolizer.Picture,//Picture	
              'stroke-width': Number(symbolizer.Width),
              'stroke-line-join': lineJoins[Number(symbolizer.JoinType)],//Width
              'stroke-line-cap': lineCaps[Number(symbolizer.StartCap)],//DashCap, 0:butt, 1:round
            }
          };
        }
        break;
      case "VERTICAL":
        olSymbolizer = {
          symbol: {
            'type': 'vertical',
            'vertical-color': `rgba(${this.toRGBAArray(symbolizer.Color).join(', ')})`,//Color
            'vertical-width': Number(symbolizer.Width),//Width
            'vertical-vertical-type': Number(symbolizer.VerticalType),//VerticalType
            'vertical-left-length': Number(symbolizer.leftLength),//LeftLength
            'vertical-right-length': Number(symbolizer.rightLength),//RightLength
            'vertical-line-cap': Number(symbolizer?.StartCap),//StartCap, EndCap
            'vertical-start-pos': Number(symbolizer?.StartPos),//StartPos
            'vertical-interval': Number(symbolizer?.Interval),//Interval        
          },                        
        };
        break;
      case "DOUBLELINE":
        olSymbolizer = {
          symbol: {
            'type': 'double-line',
            'double-line-color': this.toRGBAArray(symbolizer.Color),//Color
            'double-line-width': Number(symbolizer.Width),//Width
            'double-line-type': Number(symbolizer.Type),//Type
            'double-line-space': Number(symbolizer.Space),//Space
            'double-line-line-join': lineJoins[Number(symbolizer.JoinType)],//JoinType, 0:miter, 1:bevel, 2:round
          },  
        };
        break;
      default:
        break;
    }
    return olSymbolizer;
  }

  // Polygon 스타일 객체를 OpenLayers 스타일로 변환하는 함수
  toOlPolygonStyle(polygonStyleObj) {
    return polygonStyleObj.symbolizers.map(symbolizer => {
      const olPolygonStyleObj = { style: {} };

      if (symbolizer.type === "SIMPLE") {
        const rgba = this.toRGBAArray(symbolizer.Color);
        rgba[3] = symbolizer.Transparent === "true" ? 0 : rgba[3]; // alpha 설정
        olPolygonStyleObj.style = {
          'fill-color': rgba,
        }
      } else if (symbolizer.type === "PICTURE") {
        olPolygonStyleObj.symbol = {
          'type': 'picture',
          'picture-texture-fill': Boolean(symbolizer.TextureFill), // TextureFill
        };
        olPolygonStyleObj.style = {
          'fill-pattern-src': symbolizer.Picture, // Picture
        };
      }

      Object.assign(olPolygonStyleObj.style, this.toOlLineSymbolizer(symbolizer.symbolizers[0]).style);
      return olPolygonStyleObj;
    });
  }

  // Label 스타일 객체를 OpenLayers 스타일로 변환하는 함수
  toOlLabelStyle(labelStyleObj) {
    const font = labelStyleObj.Font;
    const size = Number(labelStyleObj.Size);
    const offsetX = Number(labelStyleObj.OffsetX);
    const offsetY = Number(labelStyleObj.OffsetY);
    const bold = Boolean(labelStyleObj.Bold);
    const italic = Boolean(labelStyleObj.Italic);
    const underline = Boolean(labelStyleObj.Underline);
    const textAlign = Number(labelStyleObj.Align);
    const textAligns = [
      ['left', 'top'], ['center', 'top'], ['right', 'top'], // 0, 1, 2
      ['left', 'middle'], ['center', 'middle'], ['right', 'middle'], // 3, 4, 5
      ['left', 'bottom'], ['center', 'bottom'], ['right', 'bottom'], // 6, 7, 8
    ];

    const anchors = [
      [1, 1], [0.5, 1], [0, 1], // 0, 1, 2
      [1, 0.5], [0.5, 0.5], [0.5, 0.5], // 3, 4, 5
      [1, 0], [0.5, 0], [0, 0], // 6, 7, 8
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
        'text-font': (bold ? 'bold ' : '') + (italic ? 'italic ' : '') + size + 'px ' + font,//Font, Size, Bold, Italic
        'text-fill-color': this.toRGBAArray(labelStyleObj.Color),//Color
        'text-align': align,//Align
        'text-baseline': baseline,//Align
        'text-offset-x': offsetX,//OffsetX
        'text-offset-y': offsetY,//OffsetY
      }
    };

    if (Boolean(labelStyleObj.Outline)) {
      olLabelStyleObj.style['text-stroke-color'] = this.toRGBAArray(labelStyleObj.OutlineColor);
    }

    if (Boolean(labelStyleObj.Box)) {
      olLabelStyleObj.style['text-background-fill-color'] = this.toRGBAArray(labelStyleObj.BoxColor);
    }

    const picture = labelStyleObj?.Picture;
    if (picture) {
      olLabelStyleObj.style['icon-src'] = picture;
      olLabelStyleObj.style['icon-displacement'] = [Number(labelStyleObj.ImageOffsetX), Number(labelStyleObj.ImageOffsetY)];
      olLabelStyleObj.style['icon-anchor'] = anchors[Number(labelStyleObj.ImageAlign)];
    }

    return olLabelStyleObj;
  }

  // 레이어 객체를 OpenLayers 레이어로 변환하는 함수
  toOlMapLayer(layersObj) {
    const olLayers = {};
    for (const layerObj of layersObj) {
      olLayers[layerObj.Name] = layerObj.type === "Layer" 
        ? this.toOlLayer(layerObj)
        : this.toOlMapLayer(layerObj.layers);
    }
    return olLayers;
  }

  // 레이어 객체를 OpenLayers 레이어로 변환하는 함수
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

    const baseFilters = [
      'all',
      ['<=', ['resolution'], Math.max(...resolutions)],
      ['>', ['resolution'], Math.min(...resolutions)],
    ];

    return {
      source: layerObj.SHPSource,
      rules: layerObj.features.map(featureObj => {
        const { styleNames, filters } = this.toOlFeature(featureObj);
        return {
          styleNames,
          filter: [...baseFilters, ...filters]
        };
      })
    };
  }

  toOlFeature(featureObj) {
    const styleNames = [featureObj.GeometryStyle, featureObj.LabelStyle].filter(Boolean);

    const filters = [];
    for (const prop in featureObj.VVTStyle) {
      const [, operator, valuesPart] = featureObj.VVTStyle[prop]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<>/g, '!')
        .match(/([<>=!]+)?([\w+,]+)/);

      if (valuesPart.includes(',')) {
        const values = valuesPart.split(',').map(value => isNaN(Number(value)) ? value : Number(value));
        const filter = ['in', ['get', prop], isNaN(values[0]) ? ['literal', values] : values];
        filters.push(operator === '!' ? ['!', filter] : filter);
      } else {
        const finalOperator = !operator ? '==' : operator === '!' ? '!=' : operator;
        filters.push([finalOperator, ['get', prop], Number(valuesPart)]);
      }
    }

    return {
      styleNames: styleNames,
      filters: filters,
    };
  }

}
//const mapStyler = new OlMapStyler(map);
//const mapLoader = new MapLoader(mapStyler);
const mapLoader = new MapLoader();

const styles = mapLoader.parseMapStyle(xmlMapStyle);
let olResult = mapLoader.toOlMapStyle(styles);
console.log(JSON.stringify(olResult, null, 2));

const layers = mapLoader.parseMapLayer(xmlMapLayer);
let olResultStyle = mapLoader.toOlMapLayer(layers);

console.log(JSON.stringify(olResultStyle, null, 2));

    </script>
  </body>
</html>
