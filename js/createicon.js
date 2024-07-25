const calculateRotation = (start, end) => {
  return Math.atan2(end[1] - start[1], end[0] - start[0]);
};

const createIconStyles = (iconSrc, rotations, coordinates) => {
  return rotations.map((rotation, index) => {
    return new Style({
      image: new Icon({
        src: iconSrc, // 아이콘 경로
        rotation: rotation, // 회전 각도
      }),
      geometry: new Point(coordinates[index]), // 위치
    });
  });
};

const styles = [];
const styleFunction = function (feature) {
  const geometry = feature.getGeometry();
  const coordinates = geometry.getCoordinates(); // 모든 좌표 가져오기

  const startRotation = -calculateRotation(coordinates[0], coordinates[1]) + Math.PI;
  const endRotation = -calculateRotation(
    coordinates[coordinates.length - 2],
    coordinates[coordinates.length - 1],
  );

  // 라인 스타일
  styles.push(
    new Style({
      stroke: new Stroke({
        color: 'blue',
        width: 3,
      }),
    }),
  );

  // 시작점과 끝점 아이콘 스타일 추가
  const iconStyles = createIconStyles('data/arrow.png', [startRotation, endRotation], [coordinates[0], coordinates[coordinates.length - 1]]);
  styles.push(...iconStyles); // 배열을 펼쳐서 추가

  return styles;
};
