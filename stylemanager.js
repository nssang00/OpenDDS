// XML 예제
// <Layers>
//   <Layer id="1" name="Layer1">
//     <Style color="red" width="2"/>
//   </Layer>
//   <Layer id="2" name="Layer2">
//     <Style color="blue" width="3"/>
//   </Layer>
// </Layers>

class StyleManager {
  constructor(xmlString) {
    this.xmlString = xmlString;
    this.doc = this.parseXML(xmlString);
  }

  parseXML(xmlString) {
    const parser = new DOMParser();
    return parser.parseFromString(xmlString, "application/xml");
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
const xmlString = `
<Layers>
  <Layer id="1" name="Layer1">
    <Style color="red" width="2"/>
  </Layer>
  <Layer id="2" name="Layer2">
    <Style color="blue" width="3"/>
  </Layer>
</Layers>
`;

const styleManager = new StyleManager(xmlString);
const filteredStyles = styleManager.getFilteredStyles();
console.log(filteredStyles);
