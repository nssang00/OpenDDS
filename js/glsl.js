vec4 sampleStrokePattern(sampler2D texture, vec2 textureSize, vec2 textureOffset, vec2 sampleSize, float spacingPx, float startOffsetPx, float currentLengthPx, float currentRadiusRatio, float lineWidth) {
  float currentLengthScaled = currentLengthPx * sampleSize.y / lineWidth;
  float spacingScaled = spacingPx * sampleSize.y / lineWidth;

  // Adjust the length to prevent floating point precision issues
  float patternRepeat = sampleSize.x + spacingScaled;
  float adjustedLength = mod(currentLengthScaled + startOffsetPx, patternRepeat);
  
  // Ensure uCoordPx stays within the valid range
  if (adjustedLength < 0.0) {
    adjustedLength += patternRepeat;
  }
  float uCoordPx = clamp(adjustedLength, 0.5, sampleSize.x - 0.5);
  
  float vCoordPx = (-currentRadiusRatio * 0.5 + 0.5) * sampleSize.y;
  vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;
  
  return samplePremultiplied(texture, texCoord);
}


vec4 sampleStrokePattern(sampler2D texture, vec2 textureSize, vec2 textureOffset, vec2 sampleSize, float spacingPx, float startOffsetPx, float currentLengthPx, float currentRadiusRatio, float lineWidth) {
  float currentLengthScaled = currentLengthPx * sampleSize.y / lineWidth;
  float spacingScaled = spacingPx * sampleSize.y / lineWidth;

  float patternRepeat = sampleSize.x + spacingScaled;
  float adjustedLength = mod(currentLengthScaled + startOffsetPx, patternRepeat);
  
  float uCoordPx = clamp(adjustedLength, 0.5, sampleSize.x - 0.5);
  
  float vCoordPx = (-currentRadiusRatio * 0.5 + 0.5) * sampleSize.y;
  vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;
  
  return samplePremultiplied(texture, texCoord);
}
