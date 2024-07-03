fragContext.functions['sampleStrokePattern'] =
  `vec4 sampleStrokePattern(sampler2D texture, vec2 textureSize, vec2 textureOffset, vec2 sampleSize, float spacingPx, float currentLengthPx, float currentRadiusRatio) {
  float currentLengthScaled = currentLengthPx / sampleSize.y;
  float spacingScaled = spacingPx / sampleSize.y;
  float uCoordPx = mod(currentLengthScaled, (sampleSize.x + spacingScaled));
  // make sure that we're not sampling too close to the borders to avoid interpolation with outside pixels
  uCoordPx = clamp(uCoordPx, 0.5, sampleSize.x - 0.5);
  float vCoordPx = (-currentRadiusRatio * 0.5 + 0.5) * sampleSize.y;
  vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;
  return samplePremultiplied(texture, texCoord);
}`;


/////if ('stroke-pattern-src' in style) {
  // ... 기존 코드 ...

  // 패턴의 크기를 라인의 너비에 맞게 조정
  if ('stroke-width' in style) {
    const lineWidthExpression = expressionToGlsl(
      vertContext,
      style['stroke-width'],
      NumberType,
    );
    sampleSizeExpression = `vec2(${sampleSizeExpression}.x * ${lineWidthExpression}, ${sampleSizeExpression}.y * ${lineWidthExpression})`;
  }

  // 패턴의 위치를 조정
  if ('stroke-pattern-offset' in style) {
    offsetExpression = parseImageOffsetProperties(
      style,
      'stroke-pattern-',
      fragContext,
      sizeExpression,
      sampleSizeExpression,
    );
  }

  // ... 기존 코드 ...
}



///////
if ('stroke-pattern-src' in style) {
  const textureId = computeHash(style['stroke-pattern-src']);
  const sizeExpression = parseImageProperties(
    style,
    builder,
    uniforms,
    'stroke-pattern-',
    textureId,
  );
  let sampleSizeExpression = sizeExpression;
  let offsetExpression = 'vec2(0.)';
  if ('stroke-pattern-offset' in style && 'stroke-pattern-size' in style) {
    sampleSizeExpression = expressionToGlsl(
      fragContext,
      style[`stroke-pattern-size`],
      NumberArrayType,
    );
    offsetExpression = parseImageOffsetProperties(
      style,
      'stroke-pattern-',
      fragContext,
      sizeExpression,
      sampleSizeExpression,
    );
  }
  let spacingExpression = '0.';
  if ('stroke-pattern-spacing' in style) {
    spacingExpression = expressionToGlsl(
      fragContext,
      style['stroke-pattern-spacing'],
      NumberType,
    );
  }
  fragContext.functions['sampleStrokePattern'] =
    `vec4 sampleStrokePattern(sampler2D texture, vec2 textureSize, vec2 textureOffset, vec2 sampleSize, float spacingPx, float currentLengthPx, float currentRadiusRatio) {
    float currentLengthScaled = currentLengthPx / sampleSize.y;
    float spacingScaled = spacingPx / sampleSize.y;
    float uCoordPx = mod(currentLengthScaled, (sampleSize.x + spacingScaled));
    // make sure that we're not sampling too close to the borders to avoid interpolation with outside pixels
    uCoordPx = clamp(uCoordPx, 0.5, sampleSize.x - 0.5);
    float vCoordPx = (-currentRadiusRatio * 0.5 + 0.5) * sampleSize.y;
    vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;
    return samplePremultiplied(texture, texCoord);
  }`;
  const textureName = `u_texture${textureId}`;
  let tintExpression = '1.';
  if ('stroke-color' in style) {
    tintExpression = builder.getStrokeColorExpression();
  }
  builder.setStrokeColorExpression(
    `${tintExpression} * sampleStrokePattern(${textureName}, ${sizeExpression}, ${offsetExpression}, ${sampleSizeExpression}, ${spacingExpression}, currentLengthPx, currentRadiusRatio)`,
  );
}

if ('stroke-width' in style) {
  builder.setStrokeWidthExpression(
    expressionToGlsl(vertContext, style['stroke-width'], NumberType),
  );
}





fragContext.functions['sampleStrokePattern'] =
  `vec4 sampleStrokePattern(sampler2D texture, vec2 textureSize, vec2 textureOffset, vec2 sampleSize, float spacingPx, float currentLengthPx, float currentRadiusRatio, float lineWidth) {
  float currentLengthScaled = currentLengthPx * sampleSize.y / lineWidth;
  float spacingScaled = spacingPx * sampleSize.y / lineWidth;
  float uCoordPx = mod(currentLengthScaled, (sampleSize.x + spacingScaled));
  // make sure that we're not sampling too close to the borders to avoid interpolation with outside pixels
  uCoordPx = clamp(uCoordPx, 0.5, sampleSize.x - 0.5);
  // 여기서 vCoordPx를 수정하여 라인의 너비에 걸쳐 패턴이 반복되도록 합니다.
  float vCoordPx = mod(currentLengthPx, sampleSize.y); // 이 부분을 수정합니다.
  vCoordPx = clamp(vCoordPx, 0.5, sampleSize.y - 0.5); // vCoordPx를 적절히 조정합니다.
  vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;
  return samplePremultiplied(texture, texCoord);
}`;

