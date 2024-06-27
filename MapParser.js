export default class MapParser {
    constructor() {
        this.mapData = {};
    }

    async loadMap(mapLayerXML, mapStyleXML) {
        try {
        const mapLayerData = await this.fetchAndParseXML(mapLayerXML);
        const mapStyleData = await this.fetchAndParseXML(mapStyleXML);
        this.parseMap(mapLayerData, mapStyleData);
        return this.getMapData();
        } catch (error) {
        console.error('Error loading map:', error);
        throw error;
        }
    }

    async fetchAndParseXML(url) {
        try {    
            const response = await fetch(url);
            const xmlText = await response.text();
            return new DOMParser().parseFromString(xmlText, 'application/xml');
        } catch (error) {
            console.error('Error fetching or parsing XML', error);
            throw error;
        }        
    }

    parseMap(mapLayerXML, mapStyleXML) {
        this.mapData['layers'] = this.parseMapLayer(mapLayerXML);
        this.mapData['styles'] = this.parseMapStyle(mapStyleXML);
    }

    parseMapLayer(xmlDoc) {
        let layers = [];

        const groups = xmlDoc.getElementsByTagName("Group");
        for (let group of groups) {
            let groupObj = this.parseGroup(group);
            layers.push(groupObj);
        }

        // 독립적인 Layer 태그 처리
        const layerNodes = xmlDoc.getElementsByTagName("Layer");    
        for (let layer of layerNodes) {   
            const attributesObj = {};
            for(let attr of layer.attributes) {
                attributesObj[attr.name] = attr.value;
                console.log( 'attr name :' +attr.name + ' value : ' + attr.value)
            }               
            let layerObj = {
                Category: layer.getAttribute("Category"),
                Name: layer.getAttribute("Name"),
                FACC: layer.getAttribute("FACC"),
                GeometryType: layer.getAttribute("FACC"),
            };   
            console.log('parsemaplayer :' + layerObj.FACC)                     
            // Layer가 어떤 Group에도 속하지 않는 경우에만 처리
            if (!layer.closest("Group")) {
                let layerObj = this.parseLayer(layer);
                layers.push(layerObj);
            }
        }

        return layers;
    }


    parseMapStyle(xmlDoc) {
        let styles = [];

        const styleNodes = xmlDoc.getElementsByTagName("Style");
        for (let style of styleNodes) {
            let styleObj = {
                name: style.getAttribute("name"),
                type: style.getAttribute("type")
            };
console.log('parseMapstyle :' + styleObj.name)
            // 스타일 타입에 따라 적절한 파싱 함수 호출
            if (styleObj.type === "point") {
                this.parsePointLayer(style, styleObj);
            } else if (styleObj.type === "line") {
                this.parseLineLayer(style, styleObj);
            } else if (styleObj.type === "polygon") {
                this.parsePolygonLayer(style, styleObj);
            } else if (styleObj.type === "label") {
                this.parseLabelLayer(style, styleObj);
            }

            styles.push(styleObj);
        }

        return styles;
    }    

    parseGroup(groupNode) {
        let groupObj = {
            category: groupNode.getAttribute("Category"),
            name: groupNode.getAttribute("Name"),
            geometryType: groupNode.getAttribute("GeometryType"),
            layers: []
        };

        const layerNodes = groupNode.getElementsByTagName("Layer");
        for (let layer of layerNodes) {
            let layerObj = this.parseLayer(layer);
            groupObj.layers.push(layerObj);
        }

        return groupObj;
    }

    parseLayer(layerNode) {
        let layerObj = {
            category: layerNode.getAttribute("Category"),
            name: layerNode.getAttribute("Name"),
            geometryType: layerNode.getAttribute("GeometryType"),
            features: []
        };

        const featureNodes = layerNode.getElementsByTagName("Feature");
        for (let feature of featureNodes) {
            let featureObj = this.parseFeature(feature);
            layerObj.features.push(featureObj);
        }

        return layerObj;
    }

    parseFeature(featureNode) {
        return {
            name: featureNode.getAttribute("Name"),
            description: featureNode.getAttribute("Description"),
            geometryStyle: featureNode.getAttribute("GeometryStyle"),
            labelStyle: featureNode.getAttribute("LabelStyle")
        };
    }


    // 여기에 각 Style 타입별 파싱 함수를 구현합니다.
    parsePointLayer(styleNode, styleObj) {
        // PointLayer 파싱 로직
        // 예시: styleObj['pointDetails'] = { ... };
    }

    parseLineLayer(styleNode, styleObj) {
        // LineLayer 파싱 로직
        // 예시: styleObj['lineDetails'] = { ... };
    }

    parsePolygonLayer(styleNode, styleObj) {
        // PolygonLayer 파싱 로직
        // 예시: styleObj['polygonDetails'] = { ... };
    }

    parseLabelLayer(styleNode, styleObj) {
        // LabelLayer 파싱 로직
        // 예시: styleObj['labelDetails'] = { ... };
    }

    getMapData() {
        return this.mapData;
    }
}



function xmlToJson(xmlDoc) {
  // 객체로 변환될 노드를 정의합니다.
  let obj = {};

  if (xmlDoc.nodeType === 1) { // element
      // 속성이 있다면, 이를 처리합니다.
      if (xmlDoc.attributes.length > 0) {
          obj["@attributes"] = {};
          for (let j = 0; j < xmlDoc.attributes.length; j++) {
              let attribute = xmlDoc.attributes.item(j);
              obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
          }
      }
  } else if (xmlDoc.nodeType === 3) { // text
      obj = xmlDoc.nodeValue;
  }

  // 자식 노드를 처리합니다.
  if (xmlDoc.hasChildNodes()) {
      for(let i = 0; i < xmlDoc.childNodes.length; i++) {
          let item = xmlDoc.childNodes.item(i);
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
//////


import MapParser from './MapParser.js';

// MapParser 인스턴스 생성
const mapParser = new MapParser();

// 예제 레이어 데이터 및 그룹 데이터
const layerData = { /* 레이어 데이터 예시 */ };
const groupData = { /* 그룹 데이터 예시 */ };

// 레이어 데이터 파싱
const parsedLayer = mapParser.parseLayer(layerData);
