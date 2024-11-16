// 예시 객체
const style = {
    'icon-src': '{basePath}/aaa.png',
    'stroke-pattern-src': '{basePath}/stroke-pattern.svg',
    'fill-pattern-src': '{basePath}/fill-pattern.svg',
    'background-color': 'red'
};

// basePath 값 (이 값을 실제 경로로 설정해야 함)
const basePath = 'http://example.com/assets';

// 변환 함수
function resolvePaths(obj, basePath) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key) && key.endsWith('-src')) {
            obj[key] = obj[key].replace(/{basePath}/g, basePath); // {basePath}를 실제 값으로 변환
        }
    }
    return obj;
}

// 변환 후 결과
const resolvedStyle = resolvePaths(style, basePath);
console.log(resolvedStyle);

///////
function updateFilterToResolution(filter, dpi = 96) {
  const scaleToResolution = (scale) => scale / (dpi * (1000 / 25.4));

  return filter.map((item) => {
    if (item === "scale") return "resolution"; // "scale"을 "resolution"으로 변경
    if (typeof item === "number") return scaleToResolution(item); // 숫자 변환
    return item; // 나머지 값 그대로 유지
  });
}

// 원본 데이터
const filter = [
  "all",
  ["<=", ["scale"], 25000],
  [">", ["scale"], 50000],
  ["in", ["get", "VRR"], [0, 1, 8]]
];

// 변환 실행
const updatedFilter = filter.map(([op, key, value]) =>
  key === "scale"
    ? [op, "resolution", scaleToResolution(value)]
    : [op, key, value]
);

console.log(updatedFilter);

/////////
// OpenLayers 맵을 생성합니다.
const map = new ol.Map({
  target: 'map',  // HTML 요소 ID
  view: new ol.View({
    center: [0, 0],
    zoom: 2
  })
});

// 외부에서 레이어를 생성하여 맵에 추가하는 예시

// 타일 레이어를 생성하고 이름을 'baseLayer'로 설정
const baseLayer = new ol.layer.Tile({
  name: 'baseLayer',  // 레이어 이름 설정
  source: new ol.source.OSM(),
});

// 벡터 레이어를 생성하고 이름을 'vectorLayer'로 설정
const vectorLayer = new ol.layer.Vector({
  name: 'vectorLayer',  // 레이어 이름 설정
  source: new ol.source.Vector(),
});

// 레이어를 맵에 추가
map.addLayer(baseLayer);
map.addLayer(vectorLayer);

// 레이어의 이름을 통해 가시성을 변경하는 함수
function toggleLayerVisibility(layerName, visible) {
  // 'find' 메서드를 사용하여 이름이 일치하는 레이어 찾기
  const layer = map.getLayers().getArray().find(layer => layer.get('name') === layerName);
  
  if (layer) {
    layer.setVisible(visible);  // 해당 레이어의 가시성을 변경
  }
}

// 'vectorLayer' 레이어의 가시성을 false로 설정
toggleLayerVisibility('vectorLayer', false);

// 'baseLayer' 레이어의 가시성을 true로 설정
toggleLayerVisibility('baseLayer', true);
