const xml = `
<Style name="Agg" type="point">
  <OffsetX>0</OffsetX>
  <OffsetY>0</OffsetY>
  <PointLayer type="PICTURE">
    <Picture>ddd.png</Picture>
  </PointLayer>
  <PointLayer type="SIMPLE">
    <Picture>ddd.png</Picture>
  </PointLayer>
</Style>
`;

function parseXML(xml) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, "text/xml");

  const style = xmlDoc.getElementsByTagName("Style")[0];
  const styleObj = {
    name: style.getAttribute("name"),
    type: style.getAttribute("type"),
    OffsetX: style.getElementsByTagName("OffsetX")[0].childNodes[0].nodeValue,
    OffsetY: style.getElementsByTagName("OffsetY")[0].childNodes[0].nodeValue,
    PointLayers: Array.from(style.getElementsByTagName("PointLayer")).map(layer => ({
      type: layer.getAttribute("type"),
      Picture: layer.getElementsByTagName("Picture")[0].childNodes[0].nodeValue
    }))
  };

  return styleObj;
}

const jsObject = parseXML(xml);
console.log(jsObject);



function parseXML(xml) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, "text/xml");

  const style = xmlDoc.getElementsByTagName("Style")[0];
  const styleObj = {
    name: style.getAttribute("name"),
    type: style.getAttribute("type"),
    OffsetX: style.getElementsByTagName("OffsetX")[0].childNodes[0].nodeValue,
    OffsetY: style.getElementsByTagName("OffsetY")[0].childNodes[0].nodeValue,
    PointLayers: Array.from(style.getElementsByTagName("PointLayer")).map(layer => {
      const layerObj = { type: layer.getAttribute("type") };
      Array.from(layer.childNodes).forEach(child => {
        if (child.nodeType === 1) { // Element node type
          layerObj[child.tagName] = child.childNodes[0].nodeValue;
        }
      });
      return layerObj;
    })
  };

  return styleObj;
}

const jsObject = parseXML(xml);
console.log(jsObject);
