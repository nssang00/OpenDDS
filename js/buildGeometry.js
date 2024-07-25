function buildGeometry(flatStyle) {
  const prefix = 'geometry-';

  // geometry 타입을 평가
  const evaluateVType = stringEvaluator(flatStyle, prefix + 'type');
  if (!evaluateVType) {
    return null;
  }

  let geometry;

  // geometry 타입에 따라 geometry 객체 생성
  switch (evaluateVType) {
    case 'Point':
      geometry = new Point(); // 빈 객체 생성
      break;
    case 'MultiPoint':
      geometry = new MultiPoint(); // 빈 객체 생성
      break;
    case 'LineString':
      geometry = new LineString(); // 빈 객체 생성
      break;
    case 'MultiLineString':
      geometry = new MultiLineString(); // 빈 객체 생성
      break;
    case 'Polygon':
      geometry = new Polygon(); // 빈 객체 생성
      break;
    case 'MultiPolygon':
      geometry = new MultiPolygon(); // 빈 객체 생성
      break;
    default:
      return null;
  }

  // 리턴하는 함수에서 context를 통해 coordinates를 제공받아 geometry를 설정
  return function (context) {
    // context에서 coordinates 정보 추출
    const evaluateCoordinates = coordinateEvaluator(
      flatStyle,
      prefix + 'coordinates',
      context,
    );

    // geometry에 coordinates 설정 (layout 변수 없이)
    geometry.setCoordinates(evaluateCoordinates); // layout 매개변수 생략

    return geometry; // 생성된 geometry 객체를 반환
  };
}

