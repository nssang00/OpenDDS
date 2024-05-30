import 'ol/ol.css';
import Feature from 'ol/Feature';
import Map from 'ol/Map';
import View from 'ol/View';
import { LineString, Point } from 'ol/geom';
import { Icon, Stroke, Style } from 'ol/style';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM, Vector as VectorSource } from 'ol/source';

// 캐시 저장소
const styleCache = {};

// 아이콘 스타일 생성 함수
function createIconStyle(src) {
  return new Style({
    image: new Icon({
      anchor: [0.5, 1],
      src: src,
    }),
  });
}

// LineString 스타일 함수
function styleFunction(feature) {
  const geometry = feature.getGeometry();
  const type = geometry.getType();

  if (type === 'LineString') {
    const coordinates = geometry.getCoordinates();
    const start = coordinates[0];
    const end = coordinates[coordinates.length - 1];

    // 캐시 키 생성
    const cacheKey = `${start}-${end}`;

    // 이미 캐시에 스타일이 있는지 확인
    if (!styleCache[cacheKey]) {
      // 시작 아이콘 스타일
      const startIconStyle = createIconStyle('path/to/starticon.png');
      startIconStyle.setGeometry(new Point(start));

      // 끝 아이콘 스타일
      const endIconStyle = createIconStyle('path/to/endicon.png');
      endIconStyle.setGeometry(new Point(end));

      // 라인 스타일
      const lineStyle = new Style({
        stroke: new Stroke({
          color: 'blue',
          width: 2,
        }),
      });

      // 캐시에 저장
      styleCache[cacheKey] = [lineStyle, startIconStyle, endIconStyle];
    }

    return styleCache[cacheKey];
  }

  return null;
}

// LineString Feature 생성
const lineString = new LineString([
  [0, 0],
  [10, 10],
  [20, 20],
]);

const lineFeature = new Feature({
  geometry: lineString,
});

// 벡터 소스 및 레이어 생성
const vectorSource = new VectorSource({
  features: [lineFeature],
});

const vectorLayer = new VectorLayer({
  source: vectorSource,
  style: styleFunction,
});

// 맵 생성
const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
    vectorLayer,
  ],
  view: new View({
    center: [0, 0],
    zoom: 2,
  }),
});
