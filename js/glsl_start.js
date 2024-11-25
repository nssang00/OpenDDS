Title: WebGL Renderer: Misalignment When 'stroke-pattern-spacing' Values are Multiples

Description:
There is an issue with the WebGL renderer in OpenLayers when using stroke-pattern-spacing in a LiteralStyle. 
Specifically, when two different spacing values (e.g., 40 and 80) are applied in the same style, the alignment between the patterns becomes inconsistent. 
This results in rendering errors for the stroke pattern.
      
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
