class CustomWebGLVectorTileLayer extends WebGLVectorTileLayer {
  constructor(options) {
    super(options);
    this.parseResult = options.parseResult; // parseLiteralStyle 결과 전달
  }

  createRenderer() {
    const { builder, uniforms, attributes } = this.parseResult;

    // attributes 확장: 회전값 추가
    const extendedAttributes = [
      ...attributes,
      {
        name: 'a_rotation', // 회전값 속성 추가
        callback: (feature) => {
          const coords = feature.getGeometry().getCoordinates();
          const start = coords[0];
          const end = coords[coords.length - 1];
          return Math.atan2(end[1] - start[1], end[0] - start[0]); // 회전값 계산
        },
      },
    ];

    // WebGLPointsLayerRenderer 구성
    return new WebGLPointsLayerRenderer(this, {
      attributes: extendedAttributes, // 확장된 attributes 사용
      uniforms: {
        ...uniforms, // parseLiteralStyle의 uniforms 재활용
        u_opacity: () => this.getOpacity(), // 추가 uniform
      },
      postProcesses: [
        {
          // 추가 셰이더 로직만 postProcesses에서 처리
          fragmentShader: `
            precision mediump float;
            uniform sampler2D u_iconTexture;
            uniform float u_opacity;
            varying vec2 v_texCoord;
            varying float v_rotation;

            void main() {
              // 회전 적용
              vec2 rotatedCoords = vec2(
                v_texCoord.x * cos(v_rotation) - v_texCoord.y * sin(v_rotation),
                v_texCoord.x * sin(v_rotation) + v_texCoord.y * cos(v_rotation)
              );

              vec4 icon = texture2D(u_iconTexture, rotatedCoords);
              gl_FragColor = icon * u_opacity;
            }
          `,
          uniforms: {
            u_iconTexture: () => this.iconTexture_, // 아이콘 텍스처 전달
          },
        },
      ],
    });
  }
}

// 사용 예제
const parseResult = parseLiteralStyle({
  'fill-color': '#fff',
  'stroke-color': '#000',
  'stroke-width': 2,
  'circle-radius': 4,
  'circle-fill-color': '#777',
});

const customLayer = new CustomWebGLVectorTileLayer({
  source: vectorTileSource,
  parseResult, // parseLiteralStyle 결과 전달
});
map.addLayer(customLayer);


const parseResult = parseLiteralStyle({
  'fill-color': ['get', 'fillColor'],
  'stroke-color': ['get', 'strokeColor'],
  'stroke-width': ['get', 'strokeWidth'],
  'circle-radius': 4,
  'circle-fill-color': '#777',
});

class WebGLVectorTileLayer extends VectorTile {
  createRenderer() {
    return new WebGLVectorTileLayerRenderer(this, {
      style: {
        builder: parseResult.builder,

////
  createRenderer() {
    const attributes = Object.keys(parseResult.attributes).map(
      (name) => ({
        name,
        ...parseResult.attributes[name],
      }),
    );
    return new WebGLPointsLayerRenderer(this, {
      vertexShader: this.parseResult_.builder.getSymbolVertexShader(),
      fragmentShader: this.parseResult_.builder.getSymbolFragmentShader(),
      hitDetectionEnabled: !this.hitDetectionDisabled_,
      uniforms: this.parseResult_.uniforms,
      attributes:
        /** @type {Array<import('../renderer/webgl/PointsLayer.js').CustomAttribute>} */ (
          attributes
        ),
    });
  }

createRenderer() {
  const builder = new ShaderBuilder()
    .addAttribute('vec2 a_position') // 각 점의 좌표
    .addVarying('v_rotation', 'float') // 회전 값 전달
    .addUniform('sampler2D u_iconTexture') // 아이콘 텍스처
    .addUniform('vec2 u_resolution') // 화면 해상도
    .addUniform('float u_opacity') // 불투명도
    .setSymbolSizeExpression('vec2(16.0)') // 아이콘 크기 설정
    .setSymbolColorExpression('vec4(1.0, 1.0, 1.0, 1.0)'); // 기본 색상

  return new WebGLPointsLayerRenderer(this, {
    className: this.getClassName(),
    attributes: [
      {
        name: 'rotation', // 시작 및 끝점의 회전 값을 계산
        callback: (feature) => {
          const coords = feature.getGeometry().getCoordinates();
          const start = coords[0];
          const end = coords[coords.length - 1];
          const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
          return angle;
        },
      },
    ],
    uniforms: {
      u_iconTexture: () => this.iconTexture_, // 아이콘 텍스처 설정
      u_opacity: () => this.getOpacity(),
    },
    postProcesses: [
      {
        fragmentShader: `
          precision mediump float;
          uniform sampler2D u_iconTexture;
          uniform float u_opacity;
          varying vec2 v_texCoord;
          varying float v_rotation;

          void main() {
            vec4 icon = texture2D(u_iconTexture, v_texCoord);
            float cosAngle = cos(v_rotation);
            float sinAngle = sin(v_rotation);

            // 회전 계산
            vec2 rotatedCoords = vec2(
              v_texCoord.x * cosAngle - v_texCoord.y * sinAngle,
              v_texCoord.x * sinAngle + v_texCoord.y * cosAngle
            );

            gl_FragColor = icon * u_opacity;
          }
        `,
        uniforms: {
          u_iconTexture: () => this.iconTexture_,
        },
      },
    ],
  });
}
