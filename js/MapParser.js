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
  
      const groupObj = {};
      for(let attr of groupNode.attributes) {
          groupObj[attr.name] = attr.value;
          //console.log( 'attr name :' +attr.name + ' value : ' + attr.value)
      }        
  
  
      const layerNodes = groupNode.getElementsByTagName("Layer");
      for (let layer of layerNodes) {
          let layerObj = this.parseLayer(layer);
          groupObj.layers.push(layerObj);
      }
  
      return groupObj;
    }
  
    parseLayer(layerNode) {
  
      const layerObj = {};
      for(let attr of layerNode.attributes) {
          layerObj[attr.name] = attr.value;
          console.log( 'attr name :' +attr.name + ' value : ' + attr.value)
      }     
  
      const featureNodes = layerNode.getElementsByTagName("Feature");
      for (let feature of featureNodes) {
          let featureObj = this.parseFeature(feature);
          layerObj.features.push(featureObj);
      }
  
      return layerObj;
    }
  
    parseFeature(featureNode) {

        const featureObj = {};
        for(let attr of featureNode.attributes) {
            featureObj[attr.name] = attr.value;
            console.log( 'attr name :' +attr.name + ' value : ' + attr.value)
        }     
        const featureNodes = featureNode.getElementsByTagName("VVTStyle");

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

