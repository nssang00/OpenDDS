void main() {
  vec2 currentPoint = gl_FragCoord.xy / u_pixelRatio;

  float segmentStartDistance = computeSegmentPointDistance(
    currentPoint, v_segmentStart, v_segmentEnd, u_lineWidth, v_angleStart, u_capType, u_joinType
  );
  float segmentEndDistance = computeSegmentPointDistance(
    currentPoint, v_segmentEnd, v_segmentStart, u_lineWidth, v_angleEnd, u_capType, u_joinType
  );
  float distanceField = max(
    segmentDistanceField(currentPoint, v_segmentStart, v_segmentEnd, u_lineWidth),
    max(segmentStartDistance, segmentEndDistance)
  );

  // dash/pattern 필요시 추가계산
  float currentLengthPx = 0.0;
  float currentRadiusPx = 0.0;
  float currentRadiusRatio = 0.0;

  if (u_useStrokePattern || u_dashCount > 0) {
    float segmentLength   = length(v_segmentEnd - v_segmentStart);
    vec2 segmentTangent   = (v_segmentEnd - v_segmentStart) / segmentLength;
    vec2 segmentNormal    = vec2(-segmentTangent.y, segmentTangent.x);
    vec2 startToPoint     = currentPoint - v_segmentStart;
    float lengthToPoint   = max(0., min(dot(segmentTangent, startToPoint), segmentLength));
    currentLengthPx       = lengthToPoint + v_distanceOffsetPx;
    currentRadiusPx       = distanceFromSegment(currentPoint, v_segmentStart, v_segmentEnd);
    currentRadiusRatio    = dot(segmentNormal, startToPoint) * 2. / u_lineWidth;
  }

  if (!u_useStrokePattern && u_dashCount > 0) {
    distanceField = max(
      distanceField,
      dashDistanceField(
        currentLengthPx, currentRadiusPx, u_capType, u_lineWidth, u_dashPattern, u_dashCount, u_dashOffset
      )
    );
  }

  float alpha = smoothstep(0.5, -0.5, distanceField);
  if (alpha < 0.1) discard;

  vec4 color;
  if (u_useStrokePattern) {
    color = sampleStrokePattern(
      u_strokePatternTexture,
      u_strokePatternTextureSize,
      u_strokePatternTextureOffset,
      u_strokePatternTextureSampleSize,
      u_strokePatternTextureSpacing,
      u_strokePatternTextureStartOffset,
      currentLengthPx,
      currentRadiusRatio,
      u_lineWidth
    );
    color.a *= alpha;
  } else {
    color = u_strokeColor;
    color.a *= alpha;
  }

  color.a *= u_globalAlpha;
  color.rgb *= color.a;
  gl_FragColor = color;
}
//////ds
void main() {
  vec2 currentPoint = gl_FragCoord.xy / u_pixelRatio;

  // 1. 기본 거리 필드 계산 (별도의 baseDistanceField 변수 없이 바로 distanceField에 할당)
  float distanceField = max(
    segmentDistanceField(currentPoint, v_segmentStart, v_segmentEnd, u_lineWidth),
    max(
      computeSegmentPointDistance(...),  // segmentStartDistance
      computeSegmentPointDistance(...)   // segmentEndDistance
    )
  );

  // 2. 대시/패턴용 변수 선언
  float currentLengthPx = 0.0;
  float currentRadiusPx = 0.0;
  float currentRadiusRatio = 0.0;

  // 3. 조건부 계산: 대시나 패턴이 있을 때만 실행
  if (u_dashCount > 0 || u_useStrokePattern) {
    vec2 segmentVec = v_segmentEnd - v_segmentStart;
    float segmentLength = length(segmentVec);
    vec2 segmentTangent = segmentVec / segmentLength;
    vec2 segmentNormal = vec2(-segmentTangent.y, segmentTangent.x);
    vec2 startToPoint = currentPoint - v_segmentStart;
    
    currentLengthPx = clamp(dot(segmentTangent, startToPoint), 0.0, segmentLength)
                   + v_distanceOffsetPx;

    // 패턴 전용 계산
    if (u_useStrokePattern) {
      currentRadiusRatio = dot(segmentNormal, startToPoint) * 2.0 / u_lineWidth;
    }
    
    // 대시 전용 계산
    if (u_dashCount > 0) {
      currentRadiusPx = distanceFromSegment(currentPoint, v_segmentStart, v_segmentEnd);
    }
  }

  // 4. 대시 적용 (기존 distanceField와 비교하여 업데이트)
  if (u_dashCount > 0) {
    distanceField = max(
      distanceField,
      dashDistanceField(
        currentLengthPx, currentRadiusPx, u_capType, 
        u_lineWidth, u_dashPattern, u_dashCount, u_dashOffset
      )
    );
  }

  // 5. 조기 알파 테스트
  float alpha = smoothstep(0.5, -0.5, distanceField);
  if (alpha < 0.1) discard;

  // 6. 색상/패턴 선택
  vec4 color = u_useStrokePattern 
    ? sampleStrokePattern(..., currentLengthPx, currentRadiusRatio, ...)
    : u_strokeColor;

  // 7. 최종 색상 계산
  color.a *= alpha * u_globalAlpha;
  color.rgb *= color.a;
  gl_FragColor = color;
}
