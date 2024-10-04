// OpenLayers 스타일링 및 레이어 생성을 담당하는 클래스
class OlMapStyler {
    applyMap(map, styleData, layerData) {
        // 스타일 적용
        const styles = this.createOlStyles(styleData);
        map.setStyle(styles);  // 스타일 적용

        // 레이어 생성 및 맵에 추가
        const layers = this.createLayers(layerData);
        layers.forEach(layer => map.addLayer(layer));
    }

    createOlStyles(styleData) {
        // OpenLayers 스타일 객체 생성
        return new ol.style.Style(...);
    }

    createLayers(layerData) {
        // JSON 데이터를 바탕으로 레이어 생성
        return layerData.map(data => new ol.layer.Vector({
            source: new ol.source.Vector({ ... }),
            style: new ol.style.Style({ ... })
        }));
    }
}

// 맵을 빌드하고 적용하는 클래스
class MapBuilder {
    constructor(styler) {
        this.styler = styler;  // 스타일링 및 레이어 처리 객체 주입
    }

    async loadMap({ styleUrl, layerUrl }) {
        // 각각의 XML 데이터를 URL로부터 비동기적으로 로드하고 JSON으로 변환
        const styleXmlData = await this.fetchXML(styleUrl);
        const layerXmlData = await this.fetchXML(layerUrl);

        // 스타일과 레이어 데이터를 하나의 객체로 묶어서 반환
        const styleJsonData = this.parseXML(styleXmlData);
        const layerJsonData = this.parseXML(layerXmlData);

        return { styleData: styleJsonData, layerData: layerJsonData };
    }

    async applyMap(map, { styleUrl, layerUrl }) {
        // 1. XML 데이터를 URL로부터 비동기적으로 로드하고 하나의 객체로 묶기
        const mapData = await this.loadMap({ styleUrl, layerUrl });

        // 2. 스타일 및 레이어 적용
        this.styler.applyMap(map, mapData.styleData, mapData.layerData); // 객체에서 각각의 데이터 추출하여 넘김
    }

    async fetchXML(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();  // XML 문자열로 반환
    }

    parseXML(xmlData) {
        // XML을 JSON으로 변환하는 로직
        return jsonToXML(xmlData);  // XML을 파싱하여 JSON 형식으로 반환
    }
}

// 사용 예시
const styler = new OlMapStyler();
const mapBuilder = new MapBuilder(styler);

// 직접 URL 객체를 전달하여 스타일과 레이어를 적용
mapBuilder.applyMap(map, {
    styleUrl: 'https://example.com/path/to/style.xml',
    layerUrl: 'https://example.com/path/to/layer.xml'
});
