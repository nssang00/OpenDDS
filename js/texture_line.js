<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenLayers Polygon Image Example</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@latest/ol.css" type="text/css">
  <style>
    .map {
      width: 100%;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="map" class="map"></div>
  <script type="module" src="https://cdn.jsdelivr.net/npm/ol@latest/dist/ol.js"></script>
  <script type="text/javascript">

    // OpenLayers 기본 맵 생성
    const map = new ol.Map({
      target: 'map',
      layers: [
        new ol.layer.Tile({
          source: new ol.source.OSM()
        })
      ],
      view: new ol.View({
        center: ol.proj.fromLonLat([0, 0]), // 경도, 위도 좌표 (초기 중앙 위치)
        zoom: 4
      })
    });

    // 폴리곤 생성 (예시 좌표)
    const polygonCoords = [
      [
        [-5e6, 6e6], [-5e6, 8e6], [-3e6, 8e6], [-3e6, 6e6], [-5e6, 6e6]
      ]
    ];

    const polygon = new ol.geom.Polygon(polygonCoords);
    
    // 폴리곤 피처 생성
    const polygonFeature = new ol.Feature({
      geometry: polygon
    });

    // 폴리곤 중심 계산
    const center = polygon.getInteriorPoint().getCoordinates();

    // 중심에 아이콘 스타일 설정 (중앙에 표시할 이미지)
    const iconStyle = new ol.style.Style({
      image: new ol.style.Icon({
        anchor: [0.5, 0.5],  // 이미지 중심이 좌표에 맞춰지도록 설정
        src: 'https://openlayers.org/en/v4.6.5/examples/data/icon.png',  // 아이콘 이미지 URL
        scale: 0.5  // 이미지 크기 조정
      })
    });

    // 중심 위치에 아이콘 Feature 생성
    const iconFeature = new ol.Feature({
      geometry: new ol.geom.Point(center)  // 폴리곤의 중심 좌표에 아이콘 위치
    });

    // 아이콘에 스타일 적용
    iconFeature.setStyle(iconStyle);

    // 벡터 소스에 폴리곤 및 아이콘 Feature 추가
    const vectorSource = new ol.source.Vector({
      features: [polygonFeature, iconFeature]
    });

    // 벡터 레이어 생성 및 맵에 추가
    const vectorLayer = new ol.layer.Vector({
      source: vectorSource
    });

    map.addLayer(vectorLayer);

  </script>
</body>
</html>
