// 1. 인터페이스 역할을 하는 MapStyler
class MapStyler {
  applyMap() {
    throw new Error('applyMap 메서드는 구체적인 스타일러에서 구현해야 합니다.');
  }
}

// 2. Concrete Strategy: OlMapStyler
class OlMapStyler extends MapStyler {
  constructor(map) {
    super();
    this.map = map;  // map 객체를 멤버로 저장
  }

  applyMap() {
    console.log("OlMapStyler로 지도 스타일을 적용합니다.");
    // OpenLayers 스타일 적용 예시
    this.map.setStyle({
      fill: 'green',
      stroke: {
        color: 'black',
        width: 2,
      }
    });
  }
}

// 3. Concrete Strategy: 다른 스타일러 예시 (추가 가능)
class AnotherMapStyler extends MapStyler {
  constructor(map) {
    super();
    this.map = map;  // map 객체를 멤버로 저장
  }

  applyMap() {
    console.log("AnotherMapStyler로 지도 스타일을 적용합니다.");
    // 다른 스타일 적용 로직 (예: Leaflet.js 스타일 적용)
    this.map.setStyle({
      color: 'blue',
      weight: 5,
    });
  }
}

// 4. Context 클래스
class MapContext {
  constructor(styler) {
    this.styler = styler;
  }

  setStyler(styler) {
    this.styler = styler;
  }

  applyMap() {
    this.styler.applyMap();
  }
}

// 5. 사용 예시
// 가상 지도 객체 (실제 코드에서는 OpenLayers, Leaflet 등의 지도 객체가 들어감)
const fakeMap = {
  setStyle: function(style) {
    console.log("스타일이 적용되었습니다:", style);
  }
};

// OlMapStyler를 사용하여 스타일 적용
const olStyler = new OlMapStyler(fakeMap);  // map 객체는 OlMapStyler 생성 시 전달됨
const context = new MapContext(olStyler);
context.applyMap();  // OlMapStyler로 스타일 적용

// 다른 스타일러로 변경 (예시로 AnotherMapStyler 사용)
const anotherStyler = new AnotherMapStyler(fakeMap);  // map 객체는 AnotherMapStyler 생성 시 전달됨
context.setStyler(anotherStyler);
context.applyMap();  // AnotherMapStyler로 스타일 적용
