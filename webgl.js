dddlet spacingExpression = "0.";
let startOffsetPx = 0; // 시작 위치 오프셋을 0으로 초기화합니다.

if ("stroke-pattern-spacing" in style) {
  spacingExpression = expressionToGlsl(
    fragContext,
    style["stroke-pattern-spacing"],
    NumberType,
  );
}

if ("stroke-pattern-offset" in style) {
  // 스타일 객체에 'stroke-pattern-offset' 속성이 정의되어 있다면,
  // 해당 값을 시작 오프셋으로 사용합니다.
  startOffsetPx = expressionToGlsl(
    fragContext,
    style["stroke-pattern-offset"],
    NumberType,
  );
}

fragContext.functions["sampleStrokePattern"] =
  `vec4 sampleStrokePattern(sampler2D texture, vec2 textureSize, vec2 textureOffset, vec2 sampleSize, float spacingPx, float currentLengthPx, float currentRadiusRatio, float lineWidth) {
  float currentLengthScaled = currentLengthPx * sampleSize.y / lineWidth;
  float spacingScaled = spacingPx * sampleSize.y / lineWidth;
  float uCoordPx = mod(currentLengthScaled + ${startOffsetPx}, (sampleSize.x + spacingScaled));
  // make sure that we're not sampling too close to the borders to avoid interpolation with outside pixels
  uCoordPx = clamp(uCoordPx, 0.5, sampleSize.x - 0.5);
  float vCoordPx = (-currentRadiusRatio * 0.5 + 0.5) * sampleSize.y;
  vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;
  return samplePremultiplied(texture, texCoord);
}`;
