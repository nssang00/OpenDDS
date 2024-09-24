// 1. 공통 인터페이스 (Strategy)
class MapStyler {
  applyMap(map) {
    throw new Error("applyMap method must be implemented");
  }
}

// 2. OpenLayers에 특화된 스타일러 (Concrete Strategy)
class OlMapStyler extends MapStyler {
  applyMap(map) {
    // OpenLayers 스타일링 로직 구현
    console.log("Applying OpenLayers styles to the map");
    
    // OpenLayers 스타일 적용 예시
    map.setStyle(new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: '#ffcc33',
        width: 2
      }),
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.2)'
      })
    }));
  }
}

// 3. 다른 스타일러 (Concrete Strategy)
class AnotherMapStyler extends MapStyler {
  applyMap(map) {
    // 다른 맵 라이브러리나 스타일링 로직 구현
    console.log("Applying another map styling strategy");
  }
}

// 4. Context: 지도에 스타일 적용을 담당하는 부분
class MapContext {
  constructor(styler) {
    this.styler = styler; // 초기 스타일러 설정
  }

  setStyler(styler) {
    this.styler = styler; // 동적으로 스타일러 변경
  }

  applyStyling(map) {
    this.styler.applyMap(map); // 현재 설정된 스타일러로 스타일 적용
  }
}

// 5. 사용 예시
const olMapStyler = new OlMapStyler();
const anotherMapStyler = new AnotherMapStyler();

// MapContext에 초기 OlMapStyler 적용
const mapContext = new MapContext(olMapStyler);

// 가상의 맵 객체
const map = {}; // 실제 OpenLayers map 객체로 교체

// OlMapStyler로 맵에 스타일 적용
mapContext.applyStyling(map);

// 스타일러를 다른 전략으로 변경하여 스타일 적용
mapContext.setStyler(anotherMapStyler);
mapContext.applyStyling(map);
