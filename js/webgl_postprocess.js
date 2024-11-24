<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenLayers WebGL LineString Icon</title>
  <style>
    #map {
      width: 100%;
      height: 100vh;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/ol"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    import 'ol/ol.css';
    import { Map, View } from 'ol';
    import { fromLonLat } from 'ol/proj';
    import VectorLayer from 'ol/layer/Vector';
    import VectorSource from 'ol/source/Vector';
    import LineString from 'ol/geom/LineString';
    import Feature from 'ol/Feature';
    import { WebGLPointsLayerRenderer } from 'ol/renderer/webgl/PointsLayer';

    // 셰이더 코드 정의
    const vertexShader = `
      attribute vec2 a_position;
      attribute float a_rotation;

      uniform mat4 u_projectionMatrix;

      varying float v_rotation;
      varying vec2 v_texCoord;

      void main() {
          gl_Position = u_projectionMatrix * vec4(a_position, 0.0, 1.0);
          v_rotation = a_rotation;
          v_texCoord = a_position.xy;
      }
    `;

    const fragmentShader = `
      precision mediump float;

      uniform sampler2D u_iconTexture;
      uniform float u_opacity;

      varying float v_rotation;
      varying vec2 v_texCoord;

      void main() {
          vec2 rotatedTexCoord = vec2(
              cos(v_rotation) * (v_texCoord.x - 0.5) - sin(v_rotation) * (v_texCoord.y - 0.5) + 0.5,
              sin(v_rotation) * (v_texCoord.x - 0.5) + cos(v_rotation) * (v_texCoord.y - 0.5) + 0.5
          );
          vec4 color = texture2D(u_iconTexture, rotatedTexCoord);
          gl_FragColor = vec4(color.rgb, color.a * u_opacity);
      }
    `;

    // 아이콘 텍스처 로드
    function createTexture(gl, src) {
      const texture = gl.createTexture();
      const image = new Image();
      image.src = src;
      image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
      };
      return texture;
    }

    // 사용자 정의 WebGL Renderer
    class CustomWebGLRenderer extends WebGLPointsLayerRenderer {
      constructor(layer) {
        super(layer, {
          attributes: [
            {
              name: 'a_position',
              callback: (feature) => {
                const geometry = feature.getGeometry();
                if (geometry.getType() === 'LineString') {
                  return [
                    geometry.getFirstCoordinate(), // 시작점
                    geometry.getLastCoordinate(), // 끝점
                  ];
                }
                return [];
              },
            },
            {
              name: 'a_rotation',
              callback: (feature) => {
                const geometry = feature.getGeometry();
                if (geometry.getType() === 'LineString') {
                  const start = geometry.getFirstCoordinate();
                  const next = geometry.getCoordinateAt(0.01); // 방향 계산용 다음 좌표
                  const dx = next[0] - start[0];
                  const dy = next[1] - start[1];
                  const startAngle = Math.atan2(dy, dx);

                  const end = geometry.getLastCoordinate();
                  const prev = geometry.getCoordinateAt(0.99); // 방향 계산용 이전 좌표
                  const dxEnd = end[0] - prev[0];
                  const dyEnd = end[1] - prev[1];
                  const endAngle = Math.atan2(dyEnd, dxEnd);

                  return [startAngle, endAngle];
                }
                return [];
              },
            },
          ],
          uniforms: {
            u_iconTexture: () => iconTexture,
            u_opacity: () => 1.0,
          },
          vertexShader: vertexShader,
          fragmentShader: fragmentShader,
        });
      }
    }

    // LineString 데이터 생성
    const lineString = new LineString([
      [126.9784, 37.5665], // 시작점 (서울)
      [129.0756, 35.1796], // 끝점 (부산)
    ]);

    const feature = new Feature(lineString);

    // 데이터 소스 및 레이어 설정
    const source = new VectorSource({
      features: [feature],
    });

    const vectorLayer = new VectorLayer({
      source: source,
      renderer: (layer) => new CustomWebGLRenderer(layer),
    });

    // OpenLayers 지도 생성
    const map = new Map({
      target: 'map',
      layers: [vectorLayer],
      view: new View({
        center: fromLonLat([127.5, 36.5]),
        zoom: 7,
      }),
    });
  </script>
</body>
</html>
