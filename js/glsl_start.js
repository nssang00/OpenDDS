vec4 sampleStrokePattern(sampler2D texture, vec2 textureSize, vec2 textureOffset, vec2 sampleSize, float spacingPx, float startOffsetPx, float currentLengthPx, float currentRadiusRatio, float lineWidth) {
  float aspectRatio = sampleSize.x / sampleSize.y; // 이미지 가로/세로 비율 계산
  float currentLengthScaled = currentLengthPx * sampleSize.y / lineWidth;
  float spacingScaled = spacingPx * sampleSize.y / (lineWidth * aspectRatio); // 간격에 비율 반영
  float uCoordPx = mod(currentLengthScaled + startOffsetPx, (sampleSize.x + spacingScaled));
  uCoordPx = clamp(uCoordPx, 0.5, sampleSize.x - 0.5);
  float vCoordPx = (-currentRadiusRatio * 0.5 + 0.5) * sampleSize.y;
  vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;
  return samplePremultiplied(texture, texCoord);
}


vec4 sampleStrokePattern(
    sampler2D texture, 
    vec2 textureSize, 
    vec2 textureOffset, 
    vec2 sampleSize, 
    float spacingPx, 
    float startOffsetPx,  // 시작점 오프셋 (픽셀 단위)
    float currentLengthPx, 
    float currentRadiusRatio, 
    float lineWidth
) {
    // 시작점과 현재 길이를 조합하여 스케일링된 현재 길이를 계산
    float currentLengthScaled = (currentLengthPx - startOffsetPx) * sampleSize.y / lineWidth;
    float spacingScaled = spacingPx * sampleSize.y / lineWidth;

    // 패턴 내에서 현재 위치(u 좌표) 계산
    float uCoordPx = mod(currentLengthScaled, (sampleSize.x + spacingScaled));

    // 샘플링 범위를 텍스처 경계 내로 제한
    uCoordPx = clamp(uCoordPx, 0.5, sampleSize.x - 0.5);

    // v 좌표 계산 (반경 비율 기반)
    float vCoordPx = (-currentRadiusRatio * 0.5 + 0.5) * sampleSize.y;

    // 텍스처 좌표 계산
    vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;

    // 텍스처 샘플링 및 반환
    return texture2D(texture, texCoord);
}

vec4 sampleStrokePattern(
    sampler2D texture, 
    vec2 textureSize, 
    vec2 textureOffset, 
    vec2 sampleSize, 
    float spacingPx, 
    float startOffsetPx,  // 시작점 오프셋
    float currentLengthPx, 
    float currentRadiusRatio, 
    float lineWidth
) {
    // 간격과 시작 오프셋을 스케일링
    float spacingScaled = round(spacingPx * sampleSize.y / lineWidth);
    float repeatLength = sampleSize.x + spacingScaled;

    // 시작점을 간격의 배수로 조정
    float adjustedStartOffset = floor(startOffsetPx / repeatLength) * repeatLength;

    // 시작점 반영한 현재 위치 계산
    float currentLengthScaled = (currentLengthPx - adjustedStartOffset) * sampleSize.y / lineWidth;

    // u 좌표를 명시적으로 반복 계산
    float uCoordPx = currentLengthScaled - floor(currentLengthScaled / repeatLength) * repeatLength;

    // 텍스처 경계 내로 제한
    uCoordPx = clamp(uCoordPx, 0.5, sampleSize.x - 0.5);

    // v 좌표 계산 (반경 비율 기반)
    float vCoordPx = (-currentRadiusRatio * 0.5 + 0.5) * sampleSize.y;

    // 텍스처 좌표 계산
    vec2 texCoord = (vec2(uCoordPx, vCoordPx) + textureOffset) / textureSize;

    // 텍스처 샘플링 및 반환
    return texture2D(texture, texCoord);
}
