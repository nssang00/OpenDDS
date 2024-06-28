function parseStyle(xmlDoc) {
  const styles = xmlDoc.getElementsByTagName("Style");
  const parsedStyles = [];

  for (let i = 0; i < styles.length; i++) {
    const style = styles[i];
    const parsedStyle = {
      name: style.getAttribute("name"),
      type: style.getAttribute("type")
    };

    switch (parsedStyle.type) {
      case "point":
        parsedStyle.pointLayer = parsePointLayer(style);
        break;
      case "line":
        parsedStyle.lineLayers = parseLineLayers(style);
        break;
      case "polygon":
        parsedStyle.polygonLayer = parsePolygonLayer(style);
        break;
      case "label":
        parsedStyle.labelLayer = parseLabelLayer(style);
        break;
      default:
        break;
    }

    parsedStyles.push(parsedStyle);
  }

  return parsedStyles;
}

function parsePointLayer(styleNode) {
  const pointLayer = styleNode.getElementsByTagName("PointLayer")[0];
  return {
    type: pointLayer.getAttribute("type"),
    picture: pointLayer.getElementsByTagName("Picture")[0].textContent
  };
}

function parseLineLayers(styleNode) {
  const lineLayers = [];
  const lineLayers_nodes = styleNode.getElementsByTagName("LineLayer");

  for (let i = 0; i < lineLayers_nodes.length; i++) {
    const lineLayer = lineLayers_nodes[i];
    const lineLayerType = lineLayer.getAttribute("type");
    const parsedLineLayer = {
      type: lineLayerType,
      color: parseColor(lineLayer.getElementsByTagName("Color")[0].textContent),
      width: parseInt(lineLayer.getElementsByTagName("Width")[0].textContent),
      joinType: parseInt(lineLayer.getElementsByTagName("JoinType")[0].textContent)
    };

    if (lineLayerType === "DASH") {
      parsedLineLayer.dash = parseDash(lineLayer.getElementsByTagName("Dash")[0]);
    } else if (lineLayerType === "PICTURE") {
      parsedLineLayer.picture = lineLayer.getElementsByTagName("Picture")[0].textContent;
      parsedLineLayer.textureLine = lineLayer.getElementsByTagName("TextureLine")[0].textContent === "true";
    }

    lineLayers.push(parsedLineLayer);
  }

  return lineLayers;
}

function parsePolygonLayer(styleNode) {
  // 구현 필요
}

function parseLabelLayer(styleNode) {
  // 구현 필요
}

function parseColor(colorString) {
  const [a, r, g, b] = colorString.split(", ").map(Number);
  return { a, r, g, b };
}

function parseDash(dashNode) {
  const dashItems = [];
  const dashItemNodes = dashNode.getElementsByTagName("DashItem");

  for (let i = 0; i < dashItemNodes.length; i++) {
    dashItems.push(parseInt(dashItemNodes[i].textContent));
  }

  return dashItems;
}
