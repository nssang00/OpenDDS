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

  let geometry;
  

  return function (context) {
    

    return gometry;
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
