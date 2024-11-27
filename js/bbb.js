 new VectorLayer({
  source: vectorSource,
  style: (feature) => {
    return new Style({
      text: new Text({
        text: feature.get('NAME') || 'No Name', // GeoJSON 속성에서 NAME 필드 가져오기
        font: '12px Arial',
        fill: new Fill({ color: 'black' }),
        stroke: new Stroke({ color: 'white', width: 2 }),
        offsetY: -15, // 텍스트 위치 (원 위)
      }),
    });
  },
})
