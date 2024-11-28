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
    // 선 길이를 선 두께 비율로 스케일링
    float currentLengthScaled = currentLengthPx * (sampleSize.y / lineWidth);
    float spacingScaled = spacingPx * (sampleSize.y / lineWidth);

    // 현재 위치가 spacing 위치에만 해당하도록 체크
    float relativePosition = mod(currentLengthScaled + startOffsetPx, spacingScaled);
    bool isInPatternRange = relativePosition < sampleSize.x;

    // 간격 외는 투명
    if (!isInPatternRange) {
        return vec4(0.0, 0.0, 0.0, 0.0);
    }

    // 텍스처 좌표 계산 (spacing 내부일 때만 실행)
    float uCoordPx = clamp(relativePosition, 0.5, sampleSize.x - 0.5);
    float vCoordPx = (0.5 - currentRadiusRatio * 0.5) * sampleSize.y;
    vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;

    // 텍스처 샘플링
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
  float currentLengthScaled = currentLengthPx * (sampleSize.y / lineWidth);
  float spacingScaled = spacingPx * (sampleSize.y / lineWidth);
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
