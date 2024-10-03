// MapLoader: XML 데이터를 로드하는 클래스
class MapLoader {
    loadMap(data) {
        console.log("Loading XML data...");
        // XML 데이터를 파싱하는 로직
        return { parsedLayers: "Parsed Layers", parsedStyles: "Parsed Styles" };
    }
}

// OlMapStyler: 스타일 적용을 주도하는 클래스
class OlMapStyler {
    constructor() {
        this.mapLoader = new MapLoader();  // 내부에서 MapLoader 생성
    }

    // 데이터를 로드하고 반환하는 메서드
    loadMap(data) {
        const parsedData = this.mapLoader.loadMap(data);  // MapLoader로 데이터 로드
        return parsedData;  // 로드된 데이터를 반환
    }

    // 로드된 데이터를 바탕으로 스타일을 적용하는 메서드
    applyMap(parsedData) {
        console.log("Applying styles to OpenLayers map...");
        this.createLayers(parsedData);
    }

    createLayers(parsedData) {
        // OpenLayers 스타일과 레이어 생성 로직
        console.log("Creating layers with:", parsedData);
    }
}

// 클라이언트 코드
const olMapStyler = new OlMapStyler();
const parsedData = olMapStyler.loadMap("<xml>...</xml>");  // 외부에서 데이터 로드
olMapStyler.applyMap(parsedData);  // 외부에서 스타일 적용
