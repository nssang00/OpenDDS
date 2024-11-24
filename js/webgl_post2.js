<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WebGL LineString with Icons</title>
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
  <script type="module">
    import 'ol/ol.css';
    import { Map, View } from 'ol';
    import VectorTile from 'ol/layer/VectorTile';
    import VectorTileSource from 'ol/source/VectorTile';
    import MVT from 'ol/format/MVT';
    import { fromLonLat } from 'ol/proj';
    import { WebGLVectorTileLayerRenderer } from 'ol/renderer/webgl/VectorTileLayer';

    // 사용자 정의 WebGLVectorTileLayer
    class WebGLVectorTileLayer extends VectorTile {
      createRenderer() {
        return new WebGLVectorTileLayerRenderer(this, {
          style: {
            builder: {
              getSymbolVertexShader: () => `
                attribute vec2 a_position;
                attribute float a_pointType; // 0: start, 1: end, 2: line
                uniform mat4 u_projectionMatrix;
                uniform mat4 u_rotationMatrix;
                varying float v_pointType;
                void main() {
                  gl_Position = u_projectionMatrix * vec4(a_position, 0.0, 1.0);
                  v_pointType = a_pointType;
                }
              `,
              getSymbolFragmentShader: () => `
                precision mediump float;
                varying float v_pointType;
                uniform sampler2D u_iconStart;
                uniform sampler2D u_iconEnd;
                uniform vec4 u_lineColor;

                void main() {
                  if (v_pointType == 0.0) {
                    gl_FragColor = texture2D(u_iconStart, gl_PointCoord);
                  } else if (v_pointType == 1.0) {
                    gl_FragColor = texture2D(u_iconEnd, gl_PointCoord);
                  } else {
                    gl_FragColor = u_lineColor;
                  }
                }
              `,
            },
            attributes: [
              {
                name: 'a_pointType',
                callback: (feature, geometry) => {
                  if (geometry.getType() === 'LineString') {
                    const coords = geometry.getCoordinates();
                    const start = coords[0];
                    const end = coords[coords.length - 1];
                    return [start, end].map(() => 0).concat([2]); // Start, End, Line
                  }
                  return [];
                },
              },
            ],
            uniforms: {
              u_lineColor: () => [0.0, 0.0, 1.0, 1.0], // Blue for lines
              u_iconStart: () => document.getElementById('icon-start'),
              u_iconEnd: () => document.getElementById('icon-end'),
            },
          },
        });
      }
    }

    // 아이콘 이미지 로드
    const iconStart = new Image();
    iconStart.src = 'start-icon.png'; // 시작 아이콘 이미지 경로
    iconStart.id = 'icon-start';

    const iconEnd = new Image();
    iconEnd.src = 'end-icon.png'; // 끝 아이콘 이미지 경로
    iconEnd.id = 'icon-end';

    // 데이터 소스
    const vectorTileSource = new VectorTileSource({
      format: new MVT(),
      url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.pbf',
    });

    // 사용자 정의 레이어 생성
    const webglVectorTileLayer = new WebGLVectorTileLayer({
      source: vectorTileSource,
    });

    // 지도 설정
    const map = new Map({
      target: 'map',
      layers: [webglVectorTileLayer],
      view: new View({
        center: fromLonLat([0, 0]),
        zoom: 2,
      }),
    });

    // 아이콘 로드 완료 후 추가
    iconStart.onload = () => {
      document.body.appendChild(iconStart);
    };
    iconEnd.onload = () => {
      document.body.appendChild(iconEnd);
    };
  </script>
</body>
</html>
