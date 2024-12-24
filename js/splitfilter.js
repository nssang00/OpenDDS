

{
  static: [
    'all',
    ['==', ['get', 'type'], 'road'],
    ['>=', ['get', 'importance'], 3]
  ],
  dynamic: [
    'all',
    ['any', ['<', ['zoom'], 5], ['>', ['zoom'], 10]],
    ['>', ['resolution'], 10]
  ]
}
///////

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
          "geometry": {
            "type": "Point",
            "coordinates": [0, 0]
          },
          "properties": {
            "type": "road",
            "importance": 4
          }
        },
        {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [1, 1]
          },
          "properties": {
            "type": "building",
            "importance": 2
          }
        }
      ]
    };

    // 필터 조건
    const filterString = [
      'all',
      ['==', ['get', 'type'], 'road'],       // 정적 조건
      ['>=', ['get', 'importance'], 3],     // 정적 조건
      ['>', ['resolution'], 10],            // 동적 조건
      ['any', ['<', ['zoom'], 5], ['>', ['zoom'], 10]] // 동적 조건
    ];

    // 필터를 정적과 동적으로 분리
    function splitFilters(filterString) {
      const staticFilters = [];
      const dynamicFilters = [];

      function classifyFilters(condition) {
        if (Array.isArray(condition)) {
          const [operator, key] = condition;
          const isStatic = key?.[0] === 'get';
          const isDynamic = key?.[0] !== 'get';

          if (isStatic) {
            staticFilters.push(condition);
          } else if (isDynamic) {
            dynamicFilters.push(condition);
          } else if (operator === 'all' || operator === 'any') {
            key.slice(1).forEach(classifyFilters);
          }
        }
      }

      classifyFilters(filterString);

      return {
        static: ['all', ...staticFilters],
        dynamic: ['all', ...dynamicFilters]
      };
    }

    const { static: staticFilterString, dynamic: dynamicFilterString } = splitFilters(filterString);

    // Evaluator 생성
    const staticEvaluator = buildExpression(staticFilterString);
    const dynamicEvaluator = buildExpression(dynamicFilterString);

    // 정적 필터링
    function applyStaticFilter(features) {
      return features.filter((feature) => staticEvaluator.evaluate(feature));
    }

    // 동적 필터링
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
