<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenLayers WebGL PostProcesses Example</title>
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
                uniform mat4 u_projectionMatrix;
                varying vec2 v_texCoord;
                void main() {
                  gl_Position = u_projectionMatrix * vec4(a_position, 0.0, 1.0);
                  v_texCoord = a_position.xy;
                }
              `,
              getSymbolFragmentShader: () => `
                precision mediump float;
                varying vec2 v_texCoord;
                uniform vec4 u_color;
                void main() {
                  gl_FragColor = u_color; // 기본 선 렌더링
                }
              `,
            },
            uniforms: {
              u_color: () => [0.0, 0.8, 0.0, 1.0], // Green line color
            },
          },
          postProcesses: [
            {
              fragmentShader: `
                precision mediump float;

                uniform sampler2D u_image;
                uniform sampler2D u_iconStart;
                uniform sampler2D u_iconEnd;
                varying vec2 v_texCoord;

                void main() {
                  vec4 baseColor = texture2D(u_image, v_texCoord);

                  // 아이콘 텍스처를 좌표에 맞게 추가
                  vec4 startIcon = texture2D(u_iconStart, v_texCoord);
                  vec4 endIcon = texture2D(u_iconEnd, v_texCoord);

                  // 결과 색상 조합
                  gl_FragColor = mix(baseColor, startIcon + endIcon, 1.0);
                }
              `,
              uniforms: {
                u_iconStart: () => document.getElementById('icon-start'),
                u_iconEnd: () => document.getElementById('icon-end'),
              },
            },
          ],
        });
      }
    }

    // 아이콘 텍스처
    const iconStart = new Image();
    iconStart.src = 'start-icon.png';
    iconStart.id = 'icon-start';

    const iconEnd = new Image();
    iconEnd.src = 'end-icon.png';
    iconEnd.id = 'icon-end';

    // 데이터 소스
    const vectorTileSource = new VectorTileSource({
      format: new MVT(),
      url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.pbf',
    });

    // 사용자 정의 레이어
    const webglVectorTileLayer = new WebGLVectorTileLayer({
      source: vectorTileSource,
    });

    // 지도 초기화
    const map = new Map({
      target: 'map',
      layers: [webglVectorTileLayer],
      view: new View({
        center: fromLonLat([0, 0]),
        zoom: 2,
      }),
    });

    // 아이콘 로드 완료 후 DOM에 추가
    iconStart.onload = () => {
      document.body.appendChild(iconStart);
    };
    iconEnd.onload = () => {
      document.body.appendChild(iconEnd);
    };
  </script>
</body>
</html>
