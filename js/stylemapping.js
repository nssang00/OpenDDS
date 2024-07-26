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
