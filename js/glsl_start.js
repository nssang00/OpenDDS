
  float scaleFactor = sampleSize.y / lineWidth;
  float currentLengthScaled = currentLengthPx * scaleFactor;
  float spacingScaled = spacingPx * scaleFactor;
  float startOffsetScaled = startOffsetPx * scaleFactor;
  float uCoordPx = mod(currentLengthScaled + (sampleSize.x * 0.5 - startOffsetScaled), spacingScaled);
  uCoordPx = clamp(uCoordPx, 0.5, sampleSize.x - 0.5);
  if (uCoordPx > sampleSize.x - 1.0) {
    return vec4(0.0);
  }
  float vCoordPx = (0.5 - currentRadiusRatio * 0.5) * sampleSize.y;
  vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;
  return samplePremultiplied(texture, texCoord);

//deepseek
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
  float startOffsetScaled = startOffsetPx * sampleSize.y / lineWidth;
  float uCoordPx = mod(currentLengthScaled + (sampleSize.x * 0.5 - startOffsetPx * sampleSize.y / lineWidth), spacingScaled);
  // make sure that we're not sampling too close to the borders to avoid interpolation with outside pixels
  uCoordPx = clamp(uCoordPx, 0.5, sampleSize.x - 0.5);
  if (uCoordPx > sampleSize.x - 1.0) {
    return vec4(0.0);
  }
  float vCoordPx = (0.5 - currentRadiusRatio * 0.5) * sampleSize.y;  
  vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;
  return samplePremultiplied(texture, texCoord);
}

///////center image처리
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
  float uCoordPx = mod(currentLengthScaled + (sampleSize.x * 0.5 - startOffsetPx), spacingScaled);
  uCoordPx = clamp(uCoordPx, 0.5, sampleSize.x - 0.5);
  if (uCoordPx > sampleSize.x - 1.0) {
    return vec4(0.0);
  }
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
  float currentLengthScaled = currentLengthPx * (sampleSize.y / lineWidth);
  float spacingScaled = spacingPx * (sampleSize.y / lineWidth);
  float uCoordPx = mod(currentLengthScaled + startOffsetPx, spacingScaled);
  uCoordPx = clamp(uCoordPx, 0.5, sampleSize.x - 0.5);
  float vCoordPx = (0.5 - currentRadiusRatio * 0.5) * sampleSize.y;
  if (uCoordPx > sampleSize.x - 1.0) {
    return vec4(0.0);
  }
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
  float scaleFactor = sampleSize.y / lineWidth;
  float currentLengthScaled = currentLengthPx * scaleFactor;
  float spacingScaled = spacingPx * scaleFactor;

  // Calculate horizontal texture coordinate in pixels
  float uCoordPx = mod(currentLengthScaled + startOffsetPx, spacingScaled);
  
  // Check if the current position is within the valid drawing range
  bool isInPattern = uCoordPx >= 0.5 && uCoordPx <= sampleSize.x - 0.5;

  // Clamp to ensure the texture sampling stays within bounds
  uCoordPx = clamp(uCoordPx, 0.5, sampleSize.x - 0.5);

  // Calculate vertical texture coordinate
  float vCoordPx = (0.5 - currentRadiusRatio * 0.5) * sampleSize.y;
  
  // Compute final texture coordinate
  vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;

  // If outside the pattern, return transparent color
  if (!isInPattern) {
    return vec4(0.0); // Fully transparent
  }

  // Sample the texture and return the color
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
