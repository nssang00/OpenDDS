<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenLayers Filter Test</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol/ol.css">
  <style>
    #map {
      width: 100%;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script src="https://cdn.jsdelivr.net/npm/ol/ol.js"></script>
  <script>
    import { buildExpression } from 'ol/expr';

    // 테스트용 GeoJSON 데이터
    const geojsonData = {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "geometry": { "type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
          "properties": { "layer": "waterway", "class": "lake", "railway": false }
        },
        {
          "type": "Feature",
          "geometry": { "type": "Point", "coordinates": [1, 1] },
          "properties": { "layer": "roads", "railway": true }
        },
        {
          "type": "Feature",
          "geometry": { "type": "Polygon", "coordinates": [[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]] },
          "properties": { "layer": "buildings", "class": "urban", "railway": false }
        }
      ]
    };

    // 필터 조건 (입력값)
    const filterString = [
      'all',
      ['<', ['resolution'], 600],
      ['in', ['get', 'class'], ['literal', ['lake', 'river']]],
      ['==', ['get', 'layer'], 'waterway'],
    ];

    // 필터 분리 함수
    function splitFilters(filterString) {
      const staticFilters = [];
      const dynamicFilters = [];

      function classifyFilters(condition) {
        if (Array.isArray(condition)) {
          const [operator, ...args] = condition;
          const containsDynamic = args.some(arg =>
            Array.isArray(arg) && (arg[0] === 'resolution' || arg[0] === 'zoom')
          );

          if (containsDynamic) {
            dynamicFilters.push(condition);
          } else {
            staticFilters.push(condition);
          }
        }
      }

      classifyFilters(filterString);

      return {
        static: ['all', ...staticFilters],
        dynamic: ['all', ...dynamicFilters]
      };
    }

    // 필터 분리
    const { static: staticFilterString, dynamic: dynamicFilterString } = splitFilters(filterString);

    // Evaluator 생성
    const staticEvaluator = buildExpression(staticFilterString);
    const dynamicEvaluator = buildExpression(dynamicFilterString);

    // 정적 필터 적용
    function applyStaticFilter(features) {
      return features.filter(feature => staticEvaluator.evaluate(feature));
    }

    // 동적 필터 적용
    function applyDynamicFilter(context) {
      return dynamicEvaluator.evaluate(context);
    }

    // 지도 초기화
    const map = new ol.Map({
      target: 'map',
      layers: [],
      view: new ol.View({
        center: [0, 0],
        zoom: 6
      })
    });

    // 정적 필터 적용
    const source = new ol.source.Vector({
      features: new ol.format.GeoJSON().readFeatures(geojsonData)
    });

    const staticFilteredFeatures = applyStaticFilter(source.getFeatures());
    const staticFilteredSource = new ol.source.Vector({
      features: staticFilteredFeatures
    });

    // 스타일 함수: 동적 필터 적용
    const styleFunction = (feature, resolution) => {
      const zoom = map.getView().getZoom();
      const context = { resolution, zoom };

      if (applyDynamicFilter(context)) {
        return new ol.style.Style({
          image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({ color: 'blue' }),
            stroke: new ol.style.Stroke({ color: 'black', width: 1 })
          })
        });
      }

      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: 6,
          fill: new ol.style.Fill({ color: 'gray' })
        })
      });
    };

    // 레이어 추가
    const vectorLayer = new ol.layer.Vector({
      source: staticFilteredSource,
      style: styleFunction
    });

    map.addLayer(vectorLayer);
  </script>
</body>
</html>
