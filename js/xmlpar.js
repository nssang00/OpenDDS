function parseXML(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  // Style 태그 찾기
  const styleTag = xmlDoc.getElementsByTagName('Style')[0];

  // 각 레이어 태그에 대한 파싱 함수
  function parsePointLayer(pointLayer) {
    // PointLayer 파싱 로직
  }

  function parseLineLayer(lineLayer) {
    // LineLayer 파싱 로직
  }

  function parsePolygonLayer(polygonLayer) {
    // PolygonLayer 파싱 로직
  }

  // Style 태그 내의 모든 자식 노드 순회
  Array.from(styleTag.children).forEach(child => {
    switch (child.tagName) {
      case 'PointLayer':
        parsePointLayer(child);
        break;
      case 'LineLayer':
        parseLineLayer(child);
        break;
      case 'PolygonLayer':
        parsePolygonLayer(child);
        break;
      default:
        // 기타 태그들은 JSON 객체로 변환
        convertToJSON(child);
    }
  });
}

function convertToJSON(xmlNode) {
  // 객체를 생성합니다.
  let obj = {};

  // 텍스트 콘텐츠 처리
  if (xmlNode.nodeType === 3) {
    obj = xmlNode.nodeValue;
  }

  // 자식 노드 처리
  if (xmlNode.hasChildNodes()) {
    for (let i = 0; i < xmlNode.childNodes.length; i++) {
      let item = xmlNode.childNodes.item(i);
      let nodeName = item.nodeName;
      if (typeof(obj[nodeName]) === "undefined") {
        obj[nodeName] = convertToJSON(item);
      } else {
        if (typeof(obj[nodeName].push) === "undefined") {
          let old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(convertToJSON(item));
      }
    }
  }
  return obj;
}

// XML 문자열 예시
const xmlString = `
<Style>
  <PointLayer>...</PointLayer>
  <LineLayer>...</LineLayer>
  <PolygonLayer>...</PolygonLayer>
  <!-- 기타 태그들 -->
</Style>
`;

// XML 파싱 실행
parseXML(xmlString);
