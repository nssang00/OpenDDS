const calculateRotation = (start, end) => {
  return Math.atan2(end[1] - start[1], end[0] - start[0]);
};

const createIconStyles = (iconSrc, coordinates) => {
  const rotations = coordinates.map((coord, index) => {
    if (index === 0) {
      return -calculateRotation(coordinates[0], coordinates[1]) + Math.PI; // 시작점 회전
    } else if (index === coordinates.length - 1) {
      return -calculateRotation(coordinates[coordinates.length - 2], coordinates[coordinates.length - 1]); // 끝점 회전
    }
    return 0; // 중간 점은 회전 없음
  });

  return rotations.map((rotation, index) => {
    return new Style({
      image: new Icon({
        src: iconSrc, // 아이콘 경로
        rotation: rotation, // 회전 각도
      }),
      geometry: new Point(coordinates[index]), // 위치
    });
  }).filter((_, index) => index === 0 || index === coordinates.length - 1); // 시작점과 끝점만 포함
};

const styles = [];
const styleFunction = function (feature) {
  const geometry = feature.getGeometry();
  const coordinates = geometry.getCoordinates(); // 모든 좌표 가져오기

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
  const iconStyles = createIconStyles('data/arrow.png', coordinates);
  styles.push(...iconStyles); // 배열을 펼쳐서 추가

  return styles;
};
