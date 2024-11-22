vec4 sampleStrokePattern(
  sampler2D texture, 
  vec2 textureSize, 
  vec2 textureOffset, 
  vec2 sampleSize, 
  float spacingPx, 
  float startOffsetPx, 
  float currentLengthPx, 
  float currentRadiusRatio, 
  float lineWidth
) {
  float currentLengthScaled = currentLengthPx * sampleSize.y / lineWidth;
  float spacingScaled = spacingPx * sampleSize.y / lineWidth;
  float uCoordPx = mod(currentLengthScaled + startOffsetPx, (sampleSize.x + spacingScaled));
  uCoordPx -= sampleSize.x / 2.0;
  uCoordPx = clamp(uCoordPx, -sampleSize.x / 2.0, sampleSize.x / 2.0);
  float vCoordPx = (-currentRadiusRatio * 0.5 + 0.5) * sampleSize.y;
  vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;
  return samplePremultiplied(texture, texCoord);
}



float calculateCorrectionWeight(float sampleSizeX) {
    float correctionWeight = 1.0 + (sampleSizeX - 5.0) / 15.0;
    return correctionWeight;
}

vec4 sampleStrokePattern(
  sampler2D texture, 
  vec2 textureSize, 
  vec2 textureOffset, 
  vec2 sampleSize, 
  float spacingPx, 
  float startOffsetPx, 
  float currentLengthPx, 
  float currentRadiusRatio, 
  float lineWidth
) {
  float correctionWeight = 10.0 / sampleSize.x; // 기준 width 10 기준으로 계산
  float spacingCorrected = spacingPx - (spacingPx * correctionWeight);
  float currentLengthScaled = currentLengthPx * (sampleSize.y / lineWidth);
  float spacingScaled = spacingCorrected * (sampleSize.y / lineWidth);
  float uCoordPx = mod(currentLengthScaled + startOffsetPx, (sampleSize.x + spacingScaled));
  uCoordPx = clamp(uCoordPx, 0.5, sampleSize.x - 0.5);
  float vCoordPx = (0.5 - currentRadiusRatio * 0.5) * sampleSize.y;
  vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;
  return samplePremultiplied(texture, texCoord);
}


vec4 sampleStrokePattern(
  sampler2D texture, 
  vec2 textureSize, 
  vec2 textureOffset, 
  vec2 sampleSize, 
  float spacingPx, 
  float startOffsetPx, 
  float currentLengthPx, 
  float currentRadiusRatio, 
  float lineWidth
) {

  float correctionFactor = sampleSize.x / spacingPx;
  float correctionWeight = 0.8; // 조정 가능한 가중치
  float spacingCorrected = spacingPx - (correctionFactor * spacingPx * correctionWeight);
  float currentLengthScaled = currentLengthPx * (sampleSize.y / lineWidth);
  float spacingScaled = spacingCorrected * (sampleSize.y / lineWidth);
  float uCoordPx = mod(currentLengthScaled + startOffsetPx, (sampleSize.x + spacingScaled));
  uCoordPx = clamp(uCoordPx, 0.5, sampleSize.x - 0.5);
  float vCoordPx = (0.5 - currentRadiusRatio * 0.5) * sampleSize.y;
  vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;
  return samplePremultiplied(texture, texCoord);
}


vec4 sampleStrokePattern(
  sampler2D texture, 
  vec2 textureSize, 
  vec2 textureOffset, 
  vec2 sampleSize, 
  float spacingPx, 
  float startOffsetPx, 
  float currentLengthPx, 
  float currentRadiusRatio, 
  float lineWidth
) {
  float correctionFactor = sampleSize.x / 2.0; // 보정 상수 k = 2.0 (필요 시 조정 가능)
  float spacingCorrected = spacingPx - correctionFactor;
  float currentLengthScaled = currentLengthPx * (sampleSize.y / lineWidth);
  float spacingScaled = spacingCorrected * (sampleSize.y / lineWidth);
  float uCoordPx = mod(currentLengthScaled + startOffsetPx, (sampleSize.x + spacingScaled));
  uCoordPx = clamp(uCoordPx, 0.5, sampleSize.x - 0.5);
  float vCoordPx = (0.5 - currentRadiusRatio * 0.5) * sampleSize.y;
  vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;
  return samplePremultiplied(texture, texCoord);
}
