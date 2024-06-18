// LineString 지오메트리를 가진 feature를 가정합니다.
const lineStringFeature = new ol.Feature({
  geometry: new ol.geom.LineString([...]) // LineString 좌표 배열
});

// 아이콘 이미지 경로와 회전값을 배열로 정의합니다.
const iconStyles = [
  {
    src: 'start-icon.png', // 시작점 아이콘 이미지 경로
    rotation: 0 // 시작점 아이콘 회전값 (라디안)
  },
  {
    src: 'end-icon.png', // 끝점 아이콘 이미지 경로
    rotation: Math.PI / 4 // 끝점 아이콘 회전값 (라디안)
  }
];

// 스타일 함수를 정의합니다.
const styleFunction = (feature) => {
  const geom = feature.getGeometry();
  const styles = [new ol.style.Style({ /* 기본 LineString 스타일 */ })];

  if (geom instanceof ol.geom.LineString) {
    const coordinates = geom.getCoordinates();
    const startPoint = coordinates[0]; // 시작점
    const endPoint = coordinates[coordinates.length - 1]; // 끝점

    // 시작점과 끝점에 대한 스타일을 배열에 추가합니다.
    iconStyles.forEach((iconStyle, index) => {
      const point = index === 0 ? startPoint : endPoint;
      styles.push(new ol.style.Style({
        geometry: new ol.geom.Point(point),
        image: new ol.style.Icon({
          src: iconStyle.src,
          rotation: iconStyle.rotation
        })
      }));
    });
  }

  return styles;
};

// feature에 스타일 함수를 적용합니다.
lineStringFeature.setStyle(styleFunction);
