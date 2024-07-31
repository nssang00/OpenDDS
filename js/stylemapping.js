function toOlStyle(stylesObj) {
  const olStyles = {};

  const styleMapping = {
    point: toOlPointStyle,
    line: toOlLineStyle,
    polygon: toOlPolygonStyle,
    Label: toOlLabelStyle
  };

  for (const styleObj of stylesObj) {
    const convertStyle = styleMapping[styleObj.type];
    if (convertStyle) {
      olStyles[styleObj.name] = convertStyle(styleObj);
    }
  }

  return olStyles;
}


function toOlStyle(stylesObj) {
  const styleTypeMap = {
    point: toOlPointStyle,
    line: toOlLineStyle,
    polygon: toOlPolygonStyle,
    Label: toOlLabelStyle
  };

  return stylesObj.reduce((olStyles, styleObj) => {
    const styleFunction = styleTypeMap[styleObj.type];
    if (styleFunction) {
      olStyles[styleObj.name] = styleFunction(styleObj);
    }
    return olStyles;
  }, {});
}
