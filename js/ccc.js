function parseXML(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  const maplayer = xmlDoc.getElementsByTagName("maplayer")[0];
  const layers = parseLayers(maplayer);

  return {
    maplayer: layers,
  };
}

function parseLayers(parent) {
  const layers = [];

  for (const child of parent.childNodes) {
    if (child.nodeName === "group") {
      layers.push({
        group: parseLayers(child),
      });
    } else if (child.nodeName === "layer") {
      layers.push({
        layer: parseAttributes(child),
      });
    }
  }

  return layers;
}

function parseAttributes(element) {
  const attributes = {};

  for (const attr of element.attributes) {
    attributes[attr.name] = attr.value;
  }

  return attributes;
}
///////

const xmlString = `
<maplayer>
    <layer id="1" name="Layer 1"/>
    <group name="Group 1">
        <layer id="2" name="Layer 2"/>
        <layer id="3" name="Layer 3"/>
    </group>
    <layer id="4" name="Layer 4"/>
</maplayer>
`;

const parser = new DOMParser();
const xmlDoc = parser.parseFromString(xmlString, "text/xml");

function parseMapLayer(xmlNode) {
    const result = {
        layers: [],
        groups: []
    };

    xmlNode.childNodes.forEach(child => {
        if (child.nodeType === 1) { // ELEMENT_NODE
            if (child.tagName === 'layer') {
                result.layers.push({
                    id: child.getAttribute('id'),
                    name: child.getAttribute('name')
                });
            } else if (child.tagName === 'group') {
                result.groups.push({
                    name: child.getAttribute('name'),
                    layers: parseMapLayer(child).layers
                });
            }
        }
    });

    return result;
}

const mapLayerJson = parseMapLayer(xmlDoc.documentElement);
console.log(JSON.stringify(mapLayerJson, null, 2));
