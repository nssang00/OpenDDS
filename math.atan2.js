import MVT from 'ol/format/MVT.js';
import Map from 'ol/Map.js';
import VectorTile from 'ol/layer/VectorTile.js';
import VectorTileSource from 'ol/source/VectorTile.js';
import View from 'ol/View.js';
import WebGLVectorTileLayerRenderer from 'ol/renderer/webgl/VectorTileLayer.js';
import {createXYZ} from 'ol/tilegrid.js';
import {parseLiteralStyle} from 'ol/webgl/styleparser.js';

/////////////
// LineString 정의
const coordinates = [
  fromLonLat([0, 0]),
  fromLonLat([1, 1]),
  fromLonLat([2, 0])
];
const lineString = new LineString(coordinates);

// 첫 포인트와 마지막 포인트 가져오기
const startPoint = new Point(coordinates[0]);
const endPoint = new Point(coordinates[coordinates.length - 1]);

// 회전 각도 계산 함수
const calculateRotation = (point1, point2) => {
  const dx = point2[0] - point1[0];
  const dy = point2[1] - point1[1];
  return Math.atan2(dy, dx);
};

// 시작 포인트와 끝 포인트의 회전 각도 계산
const startRotation = calculateRotation(coordinates[0], coordinates[1]);
const endRotation = calculateRotation(coordinates[coordinates.length - 2], coordinates[coordinates.length - 1]);

// 아이콘 스타일 정의
const startIconStyle = new Style({
  image: new Icon({
    src: 'path/to/start-icon.png',
    rotation: startRotation
  })
});

const endIconStyle = new Style({
  image: new Icon({
    src: 'path/to/end-icon.png',
    rotation: endRotation
  })
});

// Feature 생성
const startFeature = new Feature({
  geometry: startPoint,
  name: 'Start Point'
});
startFeature.setStyle(startIconStyle);

const endFeature = new Feature({
  geometry: endPoint,
  name: 'End Point'
});
endFeature.setStyle(endIconStyle);

// Vector Source 및 Layer 생성
const source = new VectorSource({
  features: [startFeature, endFeature]
});

const vectorLayer = new VectorLayer({
  source: source
});

////////////////////

// create patterns
const canvasStroke = document.createElement('canvas');
canvasStroke.width = 8;
canvasStroke.height = 2;
let context = canvasStroke.getContext('2d');
context.fillStyle = 'rgba(0,0,0,0.7)';
context.fillRect(0, 0, 4, 2);
context.fillStyle = 'rgba(255,0,0,0.7)';
context.fillRect(4, 0, 4, 2);

const variables = {};

const circleStyle = {
  'stroke-pattern-src': './data/dot.svg',
  'stroke-pattern-spacing': 4,
  'stroke-width': 20,
  'stroke-offset': -32,
};

const strokeStyle = {
  variables: variables,
  filter: ['==', ['get', 'layer'], 'waterway'],
  'stroke-color': 'green',
  'stroke-width': 2,
};
const srcPattern = {
  variables: variables,
  filter: [
    'all',
    ['==', ['get', 'layer'], 'landuse'],
    ['<', ['resolution'], 10],
  ],
  'stroke-pattern-src': './data/dot.svg',
  'stroke-pattern-spacing': 4,
  'stroke-width': 20,
  'stroke-offset': -32,
};
const imagePattern = {
  variables: variables,
  filter: ['==', ['get', 'layer'], 'water'],
  'stroke-pattern-src': canvasStroke.toDataURL('png'),
  'stroke-width': 4,
  'stroke-offset': -2,
};

const withTint = {
  filter: [
    'all',
    ['==', ['get', 'layer'], 'transportation'],
    ['==', ['geometry-type'], 'Polygon'],
  ],
  'stroke-pattern-src': './data/sprites/gis_symbols.png',
  'stroke-pattern-spacing': 2,
  'stroke-color': 'red',
  'stroke-offset': -5,
  'stroke-width': 8,
};


const result = parseLiteralStyle({
  /*
  filter: [
    'all',
    ['==', ['get', 'layer'], 'transportation'],
    ['==', ['get', 'fillColor'], 'Polygon'],
    //['==', ['geometry-type'], 'Polygon'],
  ],*/
  'stroke-pattern-src': './data/fish.png',
  'stroke-pattern-spacing': 4,
  'stroke-width': 20,
  'stroke-offset': -32,
});

const withTint_SHADERS = {
  builder: result.builder,
  attributes: {
    fillColor: {
      size: 2,
      callback: (feature) => {
        const geometryType = feature.getGeometry().getType();
        //const style = this.getStyle()(feature, 1)[0];
        //const color = asArray(style?.getFill()?.getColor() || '#eee');
        return geometryType;
        //return packColor(color);
      },
    },
  },
};

const subImage = {
  filter: [
    'all',
    ['==', ['get', 'layer'], 'landcover'],
    ['<', ['resolution'], 10],
  ],
  'stroke-pattern-src': './data/sprites/bright-v9/sprite.png',
  'stroke-pattern-offset': [63, 21],
  'stroke-pattern-offset-origin': 'top-right',
  'stroke-pattern-size': [21, 21],
  'stroke-pattern-spacing': 4,
  'stroke-width': 20,
  'stroke-color': 'green',
  'stroke-offset': 32,
};

/*
  filter: [
    'any',
    ['==', ['var', 'filterShape'], 'all'],
    ['==', ['var', 'filterShape'], ['get', 'shape']],
  ],
*/
const style = [circleStyle, srcPattern, imagePattern, withTint, withTint_SHADERS, subImage];
//const style = [strokeStyle, imagePattern,withTint];

const rules = [
  {
    filter: ['==', ['get', 'layer'], 'landcover'],
    style: {
      'fill-color': '#9db9e8',
    },
  },
  {
    else: true,
    filter: ['all', ['==', ['get', 'layer'], 'roads'], ['get', 'railway']],
    style: {
      'stroke-color': '#7de',
      'stroke-width': 1,
      'z-index': ['number', ['get', 'sort_key'], 0],
    },
  },
  {
    else: true,
    filter: ['==', ['get', 'layer'], 'roads'],
    style: {
      'stroke-color': [
        'match',
        ['get', 'kind'],
        'major_road',
        '#776',
        'minor_road',
        '#ccb',
        'highway',
        '#f39',
        'none',
      ],
      'stroke-width': ['match', ['get', 'kind'], 'highway', 1.5, 1],
      'z-index': ['number', ['get', 'sort_key'], 0],
    },
  },
  {
    else: true,
    filter: [
      'all',
      ['==', ['get', 'layer'], 'buildings'],
      ['<', ['resolution'], 10],
    ],
    style: {
      'fill-color': '#6666',
      'stroke-color': '#4446',
      'stroke-width': 1,
      'z-index': ['number', ['get', 'sort_key'], 0],
    },
  },
];

class WebGLVectorTileLayer extends VectorTile {
  createRenderer() {
    return new WebGLVectorTileLayerRenderer(this, {
      style:style,
    });
  }
}

const map = new Map({
  layers: [
    new WebGLVectorTileLayer({
      source: new VectorTileSource({
        format: new MVT(),
        tileGrid: createXYZ(),
        url: 'https://api.maptiler.com/tiles/v3/{z}/{x}/{y}.pbf?key=get_your_own_D6rA4zTHduk6KOKTXzGB',
      }),
      style: rules,
    }),
    vectorLayer
  ],
  target: 'map',
  view: new View({
    center: [1825927.7316762917, 6143091.089223046],
    zoom: 9,
  }),
});

map.getView().on('change:resolution', function (event) {
  const resolution = event.target.getResolution();
  console.log(resolution);
});

function xmlToJson(xml) {
  // 객체로 변환될 노드를 정의합니다.
  let obj = {};

  if (xml.nodeType === 1) { // element
      // 속성이 있다면, 이를 처리합니다.
      if (xml.attributes.length > 0) {
          obj["@attributes"] = {};
          for (let j = 0; j < xml.attributes.length; j++) {
              let attribute = xml.attributes.item(j);
              obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
          }
      }
  } else if (xml.nodeType === 3) { // text
      obj = xml.nodeValue;
  }

  // 자식 노드를 처리합니다.
  if (xml.hasChildNodes()) {
      for(let i = 0; i < xml.childNodes.length; i++) {
          let item = xml.childNodes.item(i);
          let nodeName = item.nodeName;
          if (typeof(obj[nodeName]) === "undefined") {
              obj[nodeName] = xmlToJson(item);
          } else {
              if (typeof(obj[nodeName].push) === "undefined") {
                  let old = obj[nodeName];
                  obj[nodeName] = [];
                  obj[nodeName].push(old);
              }
              obj[nodeName].push(xmlToJson(item));
          }
      }
  }
  return obj;
}

// XML 문자열 예시
const xmlString = `<Feature Name="nam2" Description="desc1" GeometryStyle="style02" LabelStyle="labelStyle02">
<VVTStyle ABC="5,4" CDE="4,5"></VVTStyle>
</Feature>`;

// XML 파서를 사용해서 DOM 객체를 생성합니다.
const parser = new DOMParser();
const xmlDoc = parser.parseFromString(xmlString, "text/xml");

// XML을 JSON으로 변환합니다.
const json = xmlToJson(xmlDoc);

console.log(json);

//map.getView().setRotation(Math.PI / 4);
//render({message: 'Vector tile layer rotates', tolerance: 0.01});
