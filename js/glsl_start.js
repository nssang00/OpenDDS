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
  // spacing을 textureSize.x를 기준으로 정규화
  float normalizedSpacing = spacingPx / textureSize.x;
  float normalizedStartOffset = startOffsetPx / textureSize.x;
  
  // currentLength를 정규화된 좌표계로 변환
  float normalizedCurrentLength = currentLengthPx / textureSize.x;

  // 간격 보정 계산 (width와 무관한 spacing 계산)
  float correctionFactor = sampleSize.x / spacingPx;
  float correctionWeight = 1.0; // 조정 가능한 가중치
  float spacingCorrected = normalizedSpacing - (correctionFactor * normalizedSpacing * correctionWeight);

  // 현재 위치와 간격 계산
  float currentLengthScaled = normalizedCurrentLength * (sampleSize.y / lineWidth);
  float spacingScaled = spacingCorrected * (sampleSize.y / lineWidth);
  float uCoordPx = mod(currentLengthScaled + normalizedStartOffset, (sampleSize.x / textureSize.x) + spacingScaled);
  uCoordPx = clamp(uCoordPx, 0.5 / textureSize.x, (sampleSize.x - 0.5) / textureSize.x);
  float vCoordPx = (0.5 - currentRadiusRatio * 0.5) * sampleSize.y / textureSize.y;
  vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset / textureSize) / textureSize;
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
  // 이미지 크기와 무관한 간격 계산
  float spacingCorrected = spacingPx;
  float currentLengthScaled = currentLengthPx * (sampleSize.y / lineWidth);
  float spacingScaled = spacingCorrected * (sampleSize.y / lineWidth);

  // 이미지 크기와 독립적인 좌표 계산
  float uCoordPx = mod(currentLengthScaled + startOffsetPx, (spacingScaled));
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
  float correctionWeight = 1.0; // 조정 가능한 가중치
  float spacingCorrected = spacingPx - (correctionFactor * spacingPx * correctionWeight);
  float currentLengthScaled = currentLengthPx * (sampleSize.y / lineWidth);
  float spacingScaled = spacingCorrected * (sampleSize.y / lineWidth);
  float uCoordPx = mod(currentLengthScaled + startOffsetPx, (sampleSize.x + spacingScaled));
  uCoordPx = clamp(uCoordPx, 0.5, sampleSize.x - 0.5);
  float vCoordPx = (0.5 - currentRadiusRatio * 0.5) * sampleSize.y;
  vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;
  return samplePremultiplied(texture, texCoord);
}
