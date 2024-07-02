Got it. Here's the revised code without using Array.from:
function parsePointLayers(styleNode) {
  const pointLayers = [];

  for (const layer of styleNode.getElementsByTagName("PointLayer")) {
    const layerObj = { type: layer.getAttribute("type") };

    for (const child of layer.children) {
      if (child.children.length === 0) {
        layerObj[child.tagName] = child.textContent;
      }
    }

    pointLayers.push(layerObj);
  }

  return {
    OffsetX: styleNode.getElementsByTagName("OffsetX")[0].textContent,
    OffsetY: styleNode.getElementsByTagName("OffsetX")[0].textContent,
    PointLayers: pointLayers
  };
}

function parsePointLayers(styleNode) {
  const pointLayers = [];
  const pointLayerNodes = styleNode.getElementsByTagName("PointLayer");

  for (let i = 0; i < pointLayerNodes.length; i++) {
    const layer = pointLayerNodes[i];
    const layerObj = { type: layer.getAttribute("type") };

    for (let j = 0; j < layer.children.length; j++) {
      const child = layer.children[j];

      if (child.children.length === 0) {
        layerObj[child.tagName] = child.textContent;
      }
    }

    pointLayers.push(layerObj);
  }

  return {
    OffsetX: styleNode.getElementsByTagName("OffsetX")[0].textContent,
    OffsetY: styleNode.getElementsByTagName("OffsetY")[0].textContent,
    PointLayers: pointLayers
  };
}
