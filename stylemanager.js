function parseXML(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  return xmlDoc;
}

function getLayersAndStyles(xmlDoc) {
  const layers = xmlDoc.getElementsByTagName("Layer");
  const styles = xmlDoc.getElementsByTagName("Style");

  // 레이어와 스타일 정보 파싱 로직 구현
  // 예: 각 레이어의 id, 이름, 필터 조건 등
  // 예: 각 스타일의 id, 색상, 선 굵기 등

  return { layers, styles };
}

function filterStylesByLayer(layers, styles) {
  const styledLayers = layers.map(layer => {
    // 레이어 필터 조건에 따라 스타일 필터링
    const layerStyles = styles.filter(style => {
      // 예: 레이어의 필터 조건과 스타일의 속성을 비교
      return true; // 조건에 맞는 경우
    });

    return {
      layer,
      styles: layerStyles
    };
  });

  return styledLayers;
}

class StyleManager {
  constructor(xmlString) {
    this.xmlDoc = parseXML(xmlString);
    const { layers, styles } = getLayersAndStyles(this.xmlDoc);
    this.layers = layers;
    this.styles = styles;
  }

  getStyledLayers() {
    return filterStylesByLayer(this.layers, this.styles);
  }

  getLayers() {
    const layers = [];
    const layerNodes = this.doc.querySelectorAll("Layer");
    layerNodes.forEach((layerNode) => {
      const id = layerNode.getAttribute("id");
      const name = layerNode.getAttribute("name");
      const styleNode = layerNode.querySelector("Style");
      const style = {
        color: styleNode.getAttribute("color"),
        width: styleNode.getAttribute("width"),
      };
      layers.push({ id, name, style });
    });
    return layers;
  }

  filterLayers(filterFunc) {
    return this.getLayers().filter(filterFunc);
  }

  // 필터 함수 예시: 특정 조건(여기서는 id가 1인 레이어)에 맞는 스타일 반환
  getFilteredStyles() {
    const filteredLayers = this.filterLayers((layer) => layer.id === "1");
    return filteredLayers.map((layer) => layer.style);
  }
}

// 사용 예시
const xmlString = `여기에 XML 문자열 입력`;
const styleManager = new StyleManager(xmlString);
const styledLayers = styleManager.getStyledLayers();

console.log(styledLayers); 
