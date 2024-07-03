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
      `vec4 sampleStrokePattern(sampler2D texture, vec2 textureSize, vec2 textureOffset, vec2 sampleSize, float spacingPx, float currentLengthPx, float currentRadiusRatio, float lineWidth) {
  float currentLengthScaled = currentLengthPx * sampleSize.y / lineWidth;
  float spacingScaled = spacingPx * sampleSize.y / lineWidth;
  float uCoordPx = mod(currentLengthScaled, (sampleSize.x + spacingScaled));
  // make sure that we're not sampling too close to the borders to avoid interpolation with outside pixels
  uCoordPx = clamp(uCoordPx, 0.5, sampleSize.x - 0.5);
  float vCoordPx = currentRadiusRatio * sampleSize.y;
  vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;
  return samplePremultiplied(texture, texCoord);
}`;
    const textureName = `u_texture${textureId}`;
    let tintExpression = '1.';
    if ('stroke-color' in style) {
      tintExpression = builder.getStrokeColorExpression();
    }
    builder.setStrokeColorExpression(
      `${tintExpression} * sampleStrokePattern(${textureName}, ${sizeExpression}, ${offsetExpression}, ${sampleSizeExpression}, ${spacingExpression}, currentLengthPx, currentRadiusRatio, v_width)`,
    );
  }

  if ('stroke-width' in style) {
    builder.setStrokeWidthExpression(
      expressionToGlsl(vertContext, style['stroke-width'], NumberType),
    );
  }


//////

fragContext.functions['sampleStrokePattern'] =
  `vec4 sampleStrokePattern(sampler2D texture, vec2 textureSize, vec2 textureOffset, vec2 sampleSize, float spacingPx, float currentLengthPx, float currentRadiusRatio, float lineWidth) {
    float numRepeats = ceil(lineWidth / sampleSize.y);
    vec4 color = vec4(0.0);
    for (float i = 0.0; i < numRepeats; i++) {
      float uCoordPx = mod(currentLengthPx, (sampleSize.x + spacingPx * numRepeats));
      // make sure that we're not sampling too close to the borders to avoid interpolation with outside pixels
      uCoordPx = clamp(uCoordPx, 0.5, sampleSize.x - 0.5);
      float vCoordPx = (-currentRadiusRatio * 0.5 + 0.5) * sampleSize.y * (i + 1.0);
      vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;
      color += samplePremultiplied(texture, texCoord);
    }
    return color / numRepeats;
  }`;

builder.setStrokeColorExpression(
  `${tintExpression} * sampleStrokePattern(${textureName}, ${sizeExpression}, ${offsetExpression}, ${sampleSizeExpression * lineWidth / sampleSize.y}, ${spacingExpression}, currentLengthPx, currentRadiusRatio, v_width)`,
);
