  let startOffsetExpression = '0.';
  if ('stroke-pattern-start-offset' in style) {
    startOffsetExpression = expressionToGlsl(
      fragContext,
      style['stroke-pattern-start-offset'],
      NumberType,
    );
  }
  fragContext.functions['sampleStrokePattern'] =
    `vec4 sampleStrokePattern(sampler2D texture, vec2 textureSize, vec2 textureOffset, vec2 sampleSize, float spacingPx, float startOffsetPx, float currentLengthPx, float currentRadiusRatio, float lineWidth) {
  float currentLengthScaled = currentLengthPx * sampleSize.y / lineWidth;
  float spacingScaled = spacingPx * sampleSize.y / lineWidth;
  float uCoordPx = mod(currentLengthScaled + startOffsetPx, (sampleSize.x + spacingScaled));
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
    `${tintExpression} * sampleStrokePattern(${textureName}, ${sizeExpression}, ${offsetExpression}, ${sampleSizeExpression}, ${spacingExpression}, ${startOffsetExpression}, currentLengthPx, currentRadiusRatio, v_width)`,
  );
}
