class CustomWebGLVectorTileLayer extends WebGLVectorTileLayer {
  constructor(options) {
    super(options);
    this.parseResult = options.parseResult; // parseLiteralStyle 결과 전달
  }

  createRenderer() {
    const { builder, uniforms, attributes } = this.parseResult;

    return new WebGLPointsLayerRenderer(this, {
      attributes: [
        ...attributes, // 기존 attributes 추가
        {
          name: 'a_rotation', // 회전값 속성 추가
          callback: (feature) => {
            const coords = feature.getGeometry().getCoordinates();
            const start = coords[0];
            const end = coords[coords.length - 1];
            return Math.atan2(end[1] - start[1], end[0] - start[0]); // 회전값 계산
          },
        },
      ],
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
