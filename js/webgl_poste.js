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
          // 기본 stroke vertex shader
          getStrokeVertexShader: () => `
            attribute vec2 a_position;
            uniform mat4 u_projectionMatrix;
            varying vec2 v_texCoord;
            void main() {
              gl_Position = u_projectionMatrix * vec4(a_position, 0.0, 1.0);
              v_texCoord = a_position.xy;
            }
          `,
          // 기본 stroke fragment shader
          getStrokeFragmentShader: () => `
            precision mediump float;
            varying vec2 v_texCoord;
            uniform vec4 u_color;
            void main() {
              gl_FragColor = u_color; // 기본 stroke 색상 적용
            }
          `,
        },
      },
      // PostProcess Pass 추가
      postProcesses: [
        {
          fragmentShader: `
            precision mediump float;

            uniform sampler2D u_image;
            uniform sampler2D u_iconStart;
            uniform sampler2D u_iconEnd;
            uniform float u_rotationStart;
            uniform float u_rotationEnd;

            varying vec2 v_texCoord;

            mat2 rotate(float angle) {
              return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
            }

            void main() {
              vec4 baseColor = texture2D(u_image, v_texCoord);

              // 시작점 아이콘 회전
              vec2 rotatedStartTex = rotate(u_rotationStart) * (v_texCoord - vec2(0.5, 0.5)) + vec2(0.5, 0.5);
              vec4 startIcon = texture2D(u_iconStart, rotatedStartTex);

              // 끝점 아이콘 회전
              vec2 rotatedEndTex = rotate(u_rotationEnd) * (v_texCoord - vec2(0.5, 0.5)) + vec2(0.5, 0.5);
              vec4 endIcon = texture2D(u_iconEnd, rotatedEndTex);

              // 아이콘을 합성
              gl_FragColor = baseColor + startIcon + endIcon;
            }
          `,
          uniforms: {
            u_iconStart: () => document.getElementById('icon-start'),
            u_iconEnd: () => document.getElementById('icon-end'),
            u_rotationStart: (feature) => calculateRotationAngle(feature, true),
            u_rotationEnd: (feature) => calculateRotationAngle(feature, false),
          },
        },
      ],
    });
  }
}

// 시작점과 끝점 간의 회전 각도 계산 함수
function calculateRotationAngle(feature, isStart) {
  const coordinates = feature.getGeometry().getCoordinates();
  const [x1, y1] = coordinates[isStart ? 0 : coordinates.length - 1]; // 시작점 또는 끝점
  const [x2, y2] = coordinates[isStart ? 1 : coordinates.length - 2]; // 두 번째 점 (연결된 점)

  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx); // 기울기에서 회전 각도 계산 (라디안 단위)
  return angle; // 회전 각도 반환
}

// 아이콘 텍스처 로드
const iconStart = new Image();
iconStart.src = 'start-icon.png';
iconStart.id = 'icon-start';

const iconEnd = new Image();
iconEnd.src = 'end-icon.png';
iconEnd.id = 'icon-end';

iconStart.onload = () => {
  document.body.appendChild(iconStart);
};
iconEnd.onload = () => {
  document.body.appendChild(iconEnd);
};

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
