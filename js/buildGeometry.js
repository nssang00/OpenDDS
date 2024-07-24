function buildGeometry(flatStyle, context) {
  const prefix = 'geometry-';

  const evaluateVType = stringEvaluator(flatStyle, prefix + 'type', context);
  if (!evaluateValue) {
    return null;
  }

  const evaluateCoordinates = coordinateEvaluator(
    flatStyle,
    prefix + 'coordinates',
    context,
  );

  const text = new Text({declutterMode});
  let geometry;
  

  return function (context) {
    text.setText(evaluateValue(context));

    if (evaluateFill) {
      text.setFill(evaluateFill(context));
    }

    if (evaluateBackgroundFill) {
      text.setBackgroundFill(evaluateBackgroundFill(context));
    }

    if (evaluateStroke) {
      text.setStroke(evaluateStroke(context));
    }

    if (evaluateBackgroundStroke) {
      text.setBackgroundStroke(evaluateBackgroundStroke(context));
    }

    if (evaluateFont) {
      text.setFont(evaluateFont(context));
    }

    if (evaluateMaxAngle) {
      text.setMaxAngle(evaluateMaxAngle(context));
    }


    return text;
  };
}
/////////
function getGeometry(flatGeometry) {
  switch (flatGeometry['geometry-type']) {
    case 'Point':
      return new Point(flatGeometry['geometry-coordinates']);
    case 'MultiPoint':
      return new MultiPoint(flatGeometry['geometry-coordinates']);
    case 'LineString':
      return new LineString(flatGeometry['geometry-coordinates']);
    case 'MultiLineString':
      return new MultiLineString(flatGeometry['geometry-coordinates']);
    case 'Polygon':
      return new Polygon(flatGeometry['geometry-coordinates']);
    case 'MultiPolygon':
      return new MultiPolygon(flatGeometry['geometry-coordinates']);
    default:
      return;
  }
}
