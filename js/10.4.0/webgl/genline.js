//chatgpt
function generateLineStringRenderInstructionsFromFeatures1(
  features,
  renderInstructions,
  customAttributes,
  transform,
) {
  let verticesCount = 0;
  let geometriesCount = 0;
  const geometryRenderEntries = new Array(features.length);

  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();
    const stride = geometry.getStride();

    verticesCount += flatCoordinates.length / stride;
    geometriesCount += ends.length;

    // Pixel 변환 미리 수행
    const pixelCoordinates = new Array(flatCoordinates.length);
    transform2D(
      flatCoordinates,
      0,
      flatCoordinates.length,
      stride,
      transform,
      pixelCoordinates,
      stride
    );

    geometryRenderEntries[i] = { feature, flatCoordinates, pixelCoordinates, ends, stride };
  }

  // 총 render instructions 사이즈 예측
  const totalInstructionsCount =
    7 * verticesCount +
    (1 + getCustomAttributesSize(customAttributes)) * geometriesCount;

  if (!renderInstructions || renderInstructions.length !== totalInstructionsCount) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }

  // 각도 계산 함수(공통)
  function angleBetween(p0, pA, pB) {
    const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
    const bx = pB[0] - p0[0], by = pB[1] - p0[1];
    if ((ax * ax + ay * ay) < 1e-12 || (bx * bx + by * by) < 1e-12) return 0;
    const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    return angle < 0 ? angle + 2 * Math.PI : angle;
  }

  let renderIndex = 0;
  let refCounter = 0;

  for (const entry of geometryRenderEntries) {
    const { flatCoordinates, pixelCoordinates, ends, stride } = entry;
    ++refCounter;
    let offset = 0;

    for (const end of ends) {
      // 커스텀 속성
      renderIndex += pushCustomAttributesInRenderInstructionsFromFeatures(
        renderInstructions,
        customAttributes,
        entry,
        renderIndex,
        refCounter
      );

      // 버텍스 개수
      const verticesInLine = (end - offset) / stride;
      renderInstructions[renderIndex++] = verticesInLine;

      // 미리 world좌표 슬라이스 (메모리 절약, stride만큼 복사)
      const worldCoordinates = [];
      for (let i = offset; i < end; i += stride) {
        // m/z 등 3,4차원도 대응 가능
        const coords = [];
        for (let s = 0; s < stride; ++s) coords.push(flatCoordinates[i + s] ?? 0);
        worldCoordinates.push(coords);
      }

      // Loop 여부 판단
      const isLoop = (
        worldCoordinates.length > 2 &&
        worldCoordinates[0][0] === worldCoordinates[worldCoordinates.length - 1][0] &&
        worldCoordinates[0][1] === worldCoordinates[worldCoordinates.length - 1][1]
      );

      let currentLength = 0;
      let currentAngleTangentSum = 0;

      for (let i = 0; i < worldCoordinates.length; i++) {
        const worldPoint = worldCoordinates[i];
        const pixelIndex = offset + i * stride;

        let angle0 = -1, angle1 = -1;
        let newAngleTangentSum = currentAngleTangentSum;

        // angle0 (전방, 후방 연속성 보장)
        if (i > 0) {
          const prev = worldCoordinates[i - 1];
          const next = (i < worldCoordinates.length - 1) ? worldCoordinates[i + 1] : (isLoop ? worldCoordinates[1] : null);
          if (next) {
            angle0 = angleBetween(worldPoint, next, prev);
            if (Math.cos(angle0) <= 0.985) newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
          }
        } else if (isLoop && worldCoordinates.length > 2) {
          const prev = worldCoordinates[worldCoordinates.length - 2];
          const next = worldCoordinates[1];
          angle0 = angleBetween(worldPoint, next, prev);
          if (Math.cos(angle0) <= 0.985) newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
        }

        // angle1 (다음점-다다음점)
        if (i < worldCoordinates.length - 1) {
          const next = worldCoordinates[i + 1];
          const after = (i < worldCoordinates.length - 2) ? worldCoordinates[i + 2] : (isLoop ? worldCoordinates[1] : null);
          if (after) {
            angle1 = angleBetween(next, worldPoint, after);
            if (Math.cos(angle1) <= 0.985) newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
          }
        } else if (isLoop && worldCoordinates.length > 2 && i === worldCoordinates.length - 1) {
          const next = worldCoordinates[1];
          const after = worldCoordinates[2];
          angle1 = angleBetween(next, worldPoint, after);
          if (Math.cos(angle1) <= 0.985) newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
        }

        // 버퍼에 기록 (x, y, m, angle0, angle1, 누적길이, 누적탄젠트합)
        renderInstructions[renderIndex++] = pixelCoordinates[pixelIndex];         // x
        renderInstructions[renderIndex++] = pixelCoordinates[pixelIndex + 1];     // y
        renderInstructions[renderIndex++] = worldPoint[2] ?? 0;                   // m, 없으면 0
        renderInstructions[renderIndex++] = angle0;
        renderInstructions[renderIndex++] = angle1;
        renderInstructions[renderIndex++] = currentLength;
        renderInstructions[renderIndex++] = currentAngleTangentSum;

        // 누적길이 계산
        if (i < worldCoordinates.length - 1) {
          const nextPoint = worldCoordinates[i + 1];
          currentLength += Math.hypot(
            nextPoint[0] - worldPoint[0],
            nextPoint[1] - worldPoint[1]
          );
        }
        currentAngleTangentSum = newAngleTangentSum;
      }
      offset = end;
    }
  }
  return renderInstructions;
}

////deep
function generateLineStringRenderInstructionsFromFeatures2(
  features,
  renderInstructions,
  customAttributes,
  transform,
) {
  let verticesCount = 0;
  let geometriesCount = 0;
  const geometryRenderEntries = new Array(features.length);

  // 1단계: 피처 데이터 사전 처리 (메모리 효율성 유지)
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();
    const stride = geometry.getStride();

    verticesCount += flatCoordinates.length / stride;
    geometriesCount += ends.length;

    const pixelCoordinates = new Array(flatCoordinates.length);
    transform2D(
      flatCoordinates,
      0,
      flatCoordinates.length,
      stride,
      transform,
      pixelCoordinates,
      stride
    );
    
    // 루프 여부 미리 계산 (성능 향상)
    const isLoop = ends.map(end => {
      const segmentLen = (end - (end > 0 ? ends[0] : 0)) / stride;
      if (segmentLen < 3) return false;
      
      const firstIdx = 0;
      const lastIdx = (segmentLen - 1) * stride;
      return (
        flatCoordinates[firstIdx] === flatCoordinates[lastIdx] &&
        flatCoordinates[firstIdx + 1] === flatCoordinates[lastIdx + 1]
      );
    });
    
    geometryRenderEntries[i] = { 
      feature, 
      pixelCoordinates, 
      flatCoordinates, 
      ends, 
      stride,
      isLoop
    };
  }

  // 2단계: 렌더링 버퍼 크기 계산
  const totalInstructionsCount =
    7 * verticesCount +
    (1 + getCustomAttributesSize(customAttributes)) * geometriesCount;

  if (!renderInstructions || renderInstructions.length !== totalInstructionsCount) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }

  // 3단계: 각도 계산 유틸리티 (두 버전 장점 통합)
  const angleBetween = (p0, pA, pB) => {
    const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
    const bx = pB[0] - p0[0], by = pB[1] - p0[1];
    
    const magA = ax * ax + ay * ay;
    const magB = bx * bx + by * by;
    if (magA < 1e-12 || magB < 1e-12) return 0;
    
    const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    return angle < 0 ? angle + 2 * Math.PI : angle;
  };

  // 4단계: 최적화된 좌표 접근 방식
  let renderIndex = 0;
  let refCounter = 0;

  for (const entry of geometryRenderEntries) {
    const { stride, pixelCoordinates, flatCoordinates, ends, isLoop } = entry;
    refCounter++;
    let segmentIndex = 0;
    let offset = 0;

    for (const end of ends) {
      // 커스텀 속성 처리
      renderIndex += pushCustomAttributesInRenderInstructionsFromFeatures(
        renderInstructions,
        customAttributes,
        entry,
        renderIndex,
        refCounter
      );

      const verticesInLine = (end - offset) / stride;
      renderInstructions[renderIndex++] = verticesInLine;
      
      const segmentIsLoop = isLoop[segmentIndex++];
      let currentLength = 0;
      let currentAngleTangentSum = 0;

      // 5단계: 인라인 좌표 접근 (가독성 + 성능 향상)
      for (let i = 0; i < verticesInLine; i++) {
        const idx = offset + i * stride;
        const nextIdx = offset + (i + 1) * stride;
        const prevIdx = offset + (i - 1) * stride;
        
        // 현재 좌표
        const x = flatCoordinates[idx];
        const y = flatCoordinates[idx + 1];
        const m = stride > 2 ? flatCoordinates[idx + 2] : 0;
        
        // 인접 좌표 계산
        let prev = null, next = null, after = null;
        
        // 이전 포인트
        if (i > 0) {
          prev = [flatCoordinates[prevIdx], flatCoordinates[prevIdx + 1]];
        } else if (segmentIsLoop) {
          const loopPrevIdx = offset + (verticesInLine - 2) * stride;
          prev = [flatCoordinates[loopPrevIdx], flatCoordinates[loopPrevIdx + 1]];
        }
        
        // 다음 포인트
        if (i < verticesInLine - 1) {
          next = [flatCoordinates[nextIdx], flatCoordinates[nextIdx + 1]];
        } else if (segmentIsLoop) {
          const loopNextIdx = offset + stride;
          next = [flatCoordinates[loopNextIdx], flatCoordinates[loopNextIdx + 1]];
        }
        
        // 다다음 포인트 (angle1 계산용)
        if (i < verticesInLine - 2) {
          const afterIdx = offset + (i + 2) * stride;
          after = [flatCoordinates[afterIdx], flatCoordinates[afterIdx + 1]];
        } else if (segmentIsLoop) {
          if (i === verticesInLine - 2) {
            after = [flatCoordinates[offset + stride], flatCoordinates[offset + stride + 1]];
          } else if (i === verticesInLine - 1) {
            const afterIdx = offset + 2 * stride;
            after = [flatCoordinates[afterIdx], flatCoordinates[afterIdx + 1]];
          }
        }

        // 6단계: 스마트 각도 계산 (필요시만 수행)
        let angle0 = -1, angle1 = -1;
        let newAngleTangentSum = currentAngleTangentSum;
        const currentPoint = [x, y];

        // angle0 계산 (이전 각도)
        if (prev && next) {
          angle0 = angleBetween(currentPoint, next, prev);
          if (Math.cos(angle0) <= 0.985) {
            newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
          }
        }

        // angle1 계산 (다음 각도)
        if (next && after) {
          angle1 = angleBetween(next, currentPoint, after);
          if (Math.cos(angle1) <= 0.985) {
            newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
          }
        }

        // 7단계: 렌더링 버퍼에 데이터 저장
        renderInstructions[renderIndex++] = pixelCoordinates[idx];       // x
        renderInstructions[renderIndex++] = pixelCoordinates[idx + 1];  // y
        renderInstructions[renderIndex++] = m;                          // m
        renderInstructions[renderIndex++] = angle0;
        renderInstructions[renderIndex++] = angle1;
        renderInstructions[renderIndex++] = currentLength;
        renderInstructions[renderIndex++] = newAngleTangentSum;

        // 거리 업데이트 (마지막 점 제외)
        if (i < verticesInLine - 1) {
          const dx = flatCoordinates[nextIdx] - x;
          const dy = flatCoordinates[nextIdx + 1] - y;
          currentLength += Math.sqrt(dx * dx + dy * dy);
        }
        
        currentAngleTangentSum = newAngleTangentSum;
      }
      offset = end;
    }
  }
  
  return renderInstructions;
}


//claude
function generateLineStringRenderInstructionsFromFeatures3(
  features,
  renderInstructions,
  customAttributes,
  transform,
) {
  let verticesCount = 0;
  let geometriesCount = 0;
  const geometryRenderEntries = new Array(features.length);

  // 첫 번째 패스: 메타데이터 수집 및 픽셀 좌표 변환
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();
    const stride = geometry.getStride();

    verticesCount += flatCoordinates.length / stride;
    geometriesCount += ends.length;

    const pixelCoordinates = new Array(flatCoordinates.length);
    transform2D(
      flatCoordinates,
      0,
      flatCoordinates.length,
      stride,
      transform,
      pixelCoordinates,
      stride
    );
    
    geometryRenderEntries[i] = { 
      feature, 
      pixelCoordinates, 
      flatCoordinates, 
      ends, 
      stride 
    };
  }

  // 렌더링 명령어 배열 준비
  const totalInstructionsCount =
    7 * verticesCount +
    (1 + getCustomAttributesSize(customAttributes)) * geometriesCount;

  if (!renderInstructions || renderInstructions.length !== totalInstructionsCount) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }

  // 각도 계산을 위한 최적화된 함수 (함수 1의 장점)
  function angleBetween(p0, pA, pB) {
    const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
    const bx = pB[0] - p0[0], by = pB[1] - p0[1];
    if ((ax * ax + ay * ay) < 1e-12 || (bx * bx + by * by) < 1e-12) return 0;
    const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    return angle < 0 ? angle + 2 * Math.PI : angle;
  }

  // 메모리 효율적인 좌표 접근 헬퍼 함수들 (함수 1의 장점)
  function createCoordinateHelpers(flatCoordinates, stride, offset) {
    const getCoord = (vertexIdx) => {
      const idx = offset + vertexIdx * stride;
      return [flatCoordinates[idx], flatCoordinates[idx + 1]];
    };
    
    const getM = (vertexIdx) => {
      const idx = offset + vertexIdx * stride;
      return stride > 2 ? flatCoordinates[idx + 2] : 0;
    };
    
    return { getCoord, getM };
  }

  // 루프 감지를 위한 최적화된 함수 (함수 2의 장점)
  function isLoopGeometry(flatCoordinates, offset, end, stride) {
    const verticesCount = (end - offset) / stride;
    if (verticesCount <= 2) return false;
    
    const firstIdx = offset;
    const lastIdx = end - stride;
    return flatCoordinates[firstIdx] === flatCoordinates[lastIdx] &&
           flatCoordinates[firstIdx + 1] === flatCoordinates[lastIdx + 1];
  }

  // 각도 계산 최적화 (중복 계산 방지)
  function calculateAngles(getCoord, currentIdx, verticesInLine, isLoop) {
    let angle0 = -1, angle1 = -1;
    
    // angle0 계산
    if (currentIdx > 0) {
      const prev = getCoord(currentIdx - 1);
      const next = (currentIdx < verticesInLine - 1)
        ? getCoord(currentIdx + 1)
        : (isLoop ? getCoord(1) : null);
      if (next) {
        angle0 = angleBetween(getCoord(currentIdx), next, prev);
      }
    } else if (isLoop && verticesInLine > 2) {
      const prev = getCoord(verticesInLine - 2);
      const next = getCoord(1);
      angle0 = angleBetween(getCoord(currentIdx), next, prev);
    }

    // angle1 계산
    if (currentIdx < verticesInLine - 1) {
      const next = getCoord(currentIdx + 1);
      const after = (currentIdx < verticesInLine - 2)
        ? getCoord(currentIdx + 2)
        : (isLoop ? getCoord(1) : null);
      if (after) {
        angle1 = angleBetween(next, getCoord(currentIdx), after);
      }
    } else if (isLoop && verticesInLine > 2 && currentIdx === verticesInLine - 1) {
      const next = getCoord(1);
      const after = getCoord(2);
      angle1 = angleBetween(next, getCoord(currentIdx), after);
    }
    
    return { angle0, angle1 };
  }

  // 메인 처리 루프
  let renderIndex = 0;
  let refCounter = 0;
  const ANGLE_COSINE_CUTOFF = 0.985; // 상수화로 성능 향상

  for (const entry of geometryRenderEntries) {
    const { stride, flatCoordinates, pixelCoordinates, ends } = entry;
    ++refCounter;
    let offset = 0;

    for (const end of entry.ends) {
      // 커스텀 속성 처리
      renderIndex += pushCustomAttributesInRenderInstructionsFromFeatures(
        renderInstructions,
        customAttributes,
        entry,
        renderIndex,
        refCounter
      );

      const verticesInLine = (end - offset) / stride;
      renderInstructions[renderIndex++] = verticesInLine;

      // 루프 감지 (함수 2의 장점)
      const isLoop = isLoopGeometry(flatCoordinates, offset, end, stride);
      
      // 좌표 접근 헬퍼 생성 (함수 1의 장점)
      const { getCoord, getM } = createCoordinateHelpers(flatCoordinates, stride, offset);

      let currentLength = 0;
      let currentAngleTangentSum = 0;

      // 정점 처리 루프
      for (let i = 0; i < verticesInLine; i++) {
        const pixelIndex = offset + i * stride;
        
        // 각도 계산
        const { angle0, angle1 } = calculateAngles(getCoord, i, verticesInLine, isLoop);
        
        // 각도 탄젠트 합 업데이트
        let newAngleTangentSum = currentAngleTangentSum;
        if (angle0 !== -1 && Math.cos(angle0) <= ANGLE_COSINE_CUTOFF) {
          newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
        }
        if (angle1 !== -1 && Math.cos(angle1) <= ANGLE_COSINE_CUTOFF) {
          newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
        }

        // 렌더링 명령어 저장
        renderInstructions[renderIndex++] = pixelCoordinates[pixelIndex];     // x
        renderInstructions[renderIndex++] = pixelCoordinates[pixelIndex + 1]; // y
        renderInstructions[renderIndex++] = getM(i);                          // m
        renderInstructions[renderIndex++] = angle0;
        renderInstructions[renderIndex++] = angle1;
        renderInstructions[renderIndex++] = currentLength;
        renderInstructions[renderIndex++] = currentAngleTangentSum;

        // 길이 업데이트 (다음 정점까지의 거리)
        if (i < verticesInLine - 1) {
          const current = getCoord(i);
          const next = getCoord(i + 1);
          currentLength += Math.sqrt(
            (next[0] - current[0]) ** 2 + (next[1] - current[1]) ** 2
          );
        }
        
        currentAngleTangentSum = newAngleTangentSum;
      }
      
      offset = end;
    }
  }

  return renderInstructions;
}

///deep2
function generateLineStringRenderInstructions4(
  features,
  renderInstructions,
  customAttributes,
  transform,
) {
  // 메타데이터 사전 계산
  let verticesCount = 0;
  let geometriesCount = 0;
  const entries = new Array(features.length);

  for (let i = 0; i < features.length; i++) {
    const geometry = features[i].getGeometry();
    const flatCoords = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();
    const stride = geometry.getStride();

    verticesCount += flatCoords.length / stride;
    geometriesCount += ends.length;

    // 픽셀 좌표 변환
    const pixelCoords = new Array(flatCoords.length);
    transform2D(flatCoords, 0, flatCoords.length, stride, transform, pixelCoords, stride);
    
    // 루프 여부 사전 계산 (함수2 장점)
    const isLoop = ends.map(end => {
      const count = (end - (ends[0] || 0)) / stride;
      if (count < 3) return false;
      const first = 0, last = (count - 1) * stride;
      return (
        flatCoords[first] === flatCoords[last] &&
        flatCoords[first + 1] === flatCoords[last + 1]
      );
    });

    entries[i] = { flatCoords, pixelCoords, ends, stride, isLoop };
  }

  // 렌더 버퍼 준비
  const instSize = 7 * verticesCount + (1 + getCustomAttrSize(customAttributes)) * geometriesCount;
  if (!renderInstructions || renderInstructions.length !== instSize) {
    renderInstructions = new Float32Array(instSize);
  }

  // 각도 계산 함수 (함수1 장점)
  const angleBetween = (p0, pA, pB) => {
    const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
    const bx = pB[0] - p0[0], by = pB[1] - p0[1];
    const magA = ax * ax + ay * ay;
    const magB = bx * bx + by * by;
    return (magA < 1e-12 || magB < 1e-12) ? 0 : Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
  };

  // 메인 처리 루프
  const ANGLE_THRESHOLD = Math.cos(10 * Math.PI / 180); // ≈0.985
  let idx = 0;
  let refCount = 0;

  for (const { flatCoords, pixelCoords, ends, stride, isLoop } of entries) {
    refCount++;
    let offset = 0;
    let loopIdx = 0;

    for (const end of ends) {
      // 커스텀 속성 추가
      idx += pushCustomAttrs(renderInstructions, customAttributes, idx, refCount);
      
      const vertCount = (end - offset) / stride;
      renderInstructions[idx++] = vertCount;
      const segmentLoop = isLoop[loopIdx++];

      let length = 0;
      let angleSum = 0;

      for (let i = 0; i < vertCount; i++) {
        const pos = offset + i * stride;
        const x = flatCoords[pos];
        const y = flatCoords[pos + 1];
        const m = stride > 2 ? flatCoords[pos + 2] : 0;
        
        // 인접점 계산 (함수2 방식)
        let prev = null, next = null, after = null;
        if (i > 0) prev = [flatCoords[pos - stride], flatCoords[pos - stride + 1]];
        else if (segmentLoop) {
          prev = [flatCoords[end - 2 * stride], flatCoords[end - 2 * stride + 1]];
        }
        
        if (i < vertCount - 1) next = [flatCoords[pos + stride], flatCoords[pos + stride + 1]];
        else if (segmentLoop) next = [flatCoords[offset + stride], flatCoords[offset + stride + 1]];
        
        if (i < vertCount - 2) after = [flatCoords[pos + 2 * stride], flatCoords[pos + 2 * stride + 1]];
        else if (segmentLoop) {
          after = (i === vertCount - 2)
            ? [flatCoords[offset + stride], flatCoords[offset + stride + 1]]
            : [flatCoords[offset + 2 * stride], flatCoords[offset + 2 * stride + 1]];
        }

        // 각도 계산 (함수3 장점)
        let angle0 = -1, angle1 = -1;
        let newAngleSum = angleSum;
        const curr = [x, y];

        if (prev && next) {
          angle0 = angleBetween(curr, next, prev);
          if (Math.cos(angle0) <= ANGLE_THRESHOLD) {
            newAngleSum += Math.tan((angle0 - Math.PI) / 2);
          }
        }
        
        if (next && after) {
          angle1 = angleBetween(next, curr, after);
          if (Math.cos(angle1) <= ANGLE_THRESHOLD) {
            newAngleSum += Math.tan((Math.PI - angle1) / 2);
          }
        }

        // 버퍼 저장
        renderInstructions[idx++] = pixelCoords[pos];     // x
        renderInstructions[idx++] = pixelCoords[pos + 1]; // y
        renderInstructions[idx++] = m;                   // m
        renderInstructions[idx++] = angle0;
        renderInstructions[idx++] = angle1;
        renderInstructions[idx++] = length;
        renderInstructions[idx++] = angleSum;

        // 거리 업데이트
        if (i < vertCount - 1) {
          const nextX = flatCoords[pos + stride];
          const nextY = flatCoords[pos + stride + 1];
          length += Math.sqrt((nextX - x) ** 2 + (nextY - y) ** 2);
        }
        angleSum = newAngleSum;
      }
      offset = end;
    }
  }
  return renderInstructions;
}

///grok
function generateLineStringRenderInstructions(
  features,
  renderInstructions,
  customAttributes,
  transform
) {
  let verticesCount = 0;
  let geometriesCount = 0;
  const entries = new Array(features.length);

  // 1. Preprocess features and transform coordinates
  for (let i = 0; i < features.length; i++) {
    const geometry = features[i].getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();
    const stride = geometry.getStride();

    verticesCount += flatCoordinates.length / stride;
    geometriesCount += ends.length;

    const pixelCoordinates = new Array(flatCoordinates.length);
    transform2D(flatCoordinates, 0, flatCoordinates.length, stride, transform, pixelCoordinates, stride);

    // Precompute loop status for each segment
    const isLoop = ends.map((end, idx) => {
      const start = idx > 0 ? ends[idx - 1] : 0;
      const count = (end - start) / stride;
      if (count < 3) return false;
      const first = start, last = end - stride;
      return flatCoordinates[first] === flatCoordinates[last] && 
             flatCoordinates[first + 1] === flatCoordinates[last + 1];
    });

    entries[i] = { flatCoordinates, pixelCoordinates, ends, stride, isLoop };
  }

  // 2. Prepare render buffer
  const totalInstructionsCount = 
    7 * verticesCount + 
    (1 + getCustomAttributesSize(customAttributes)) * geometriesCount;
  if (!renderInstructions || renderInstructions.length !== totalInstructionsCount) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }

  // 3. Optimized angle calculation
  const ANGLE_COSINE_CUTOFF = Math.cos(10 * Math.PI / 180); // ≈0.985
  const angleBetween = (p0, pA, pB) => {
    const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
    const bx = pB[0] - p0[0], by = pB[1] - p0[1];
    const magA = ax * ax + ay * ay;
    const magB = bx * bx + by * by;
    if (magA < 1e-12 || magB < 1e-12) return 0;
    const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    return angle < 0 ? angle + 2 * Math.PI : angle;
  };

  // 4. Coordinate access helpers
  const createCoordinateHelpers = (flatCoordinates, stride, offset) => ({
    getCoord: (vertexIdx) => {
      const idx = offset + vertexIdx * stride;
      return [flatCoordinates[idx], flatCoordinates[idx + 1]];
    },
    getM: (vertexIdx) => {
      const idx = offset + vertexIdx * stride;
      return stride > 2 ? flatCoordinates[idx + 2] : 0;
    }
  });

  // 5. Main processing loop
  let renderIndex = 0;
  let refCounter = 0;

  for (const { flatCoordinates, pixelCoordinates, ends, stride, isLoop } of entries) {
    refCounter++;
    let offset = 0;
    let loopIndex = 0;

    for (const end of ends) {
      // Add custom attributes
      renderIndex += pushCustomAttributesInRenderInstructionsFromFeatures(
        renderInstructions, customAttributes, entries[refCounter - 1], renderIndex, refCounter
      );

      const verticesInLine = (end - offset) / stride;
      renderInstructions[renderIndex++] = verticesInLine;
      const segmentIsLoop = isLoop[loopIndex++];

      const { getCoord, getM } = createCoordinateHelpers(flatCoordinates, stride, offset);
      let currentLength = 0;
      let currentAngleTangentSum = 0;

      for (let i = 0; i < verticesInLine; i++) {
        const pixelIndex = offset + i * stride;
        const current = getCoord(i);

        // Calculate angles
        let angle0 = -1, angle1 = -1;
        let newAngleTangentSum = currentAngleTangentSum;

        if (i > 0) {
          const prev = getCoord(i - 1);
          const next = i < verticesInLine - 1 ? getCoord(i + 1) : (segmentIsLoop ? getCoord(1) : null);
          if (next) {
            angle0 = angleBetween(current, next, prev);
            if (Math.cos(angle0) <= ANGLE_COSINE_CUTOFF) {
              newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
            }
          }
        } else if (segmentIsLoop && verticesInLine > 2) {
          const prev = getCoord(verticesInLine - 2);
          const next = getCoord(1);
          angle0 = angleBetween(current, next, prev);
          if (Math.cos(angle0) <= ANGLE_COSINE_CUTOFF) {
            newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
          }
        }

        if (i < verticesInLine - 1) {
          const next = getCoord(i + 1);
          const after = i < verticesInLine - 2 ? getCoord(i + 2) : (segmentIsLoop ? getCoord(1) : null);
          if (after) {
            angle1 = angleBetween(next, current, after);
            if (Math.cos(angle1) <= ANGLE_COSINE_CUTOFF) {
              newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
            }
          }
        } else if (segmentIsLoop && verticesInLine > 2 && i === verticesInLine - 1) {
          const next = getCoord(1);
          const after = getCoord(2);
          angle1 = angleBetween(next, current, after);
          if (Math.cos(angle1) <= ANGLE_COSINE_CUTOFF) {
            newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
          }
        }

        // Store in buffer
        renderInstructions[renderIndex++] = pixelCoordinates[pixelIndex];
        renderInstructions[renderIndex++] = pixelCoordinates[pixelIndex + 1];
        renderInstructions[renderIndex++] = getM(i);
        renderInstructions[renderIndex++] = angle0;
        renderInstructions[renderIndex++] = angle1;
        renderInstructions[renderIndex++] = currentLength;
        renderInstructions[renderIndex++] = currentAngleTangentSum;

        // Update length
        if (i < verticesInLine - 1) {
          const next = getCoord(i + 1);
          currentLength += Math.sqrt(
            (next[0] - current[0]) * (next[0] - current[0]) +
            (next[1] - current[1]) * (next[1] - current[1])
          );
        }

        currentAngleTangentSum = newAngleTangentSum;
      }
      offset = end;
    }
  }

  return renderInstructions;
}


///chat
function generateLineStringRenderInstructions(
  features,
  renderInstructions,
  customAttributes,
  transform
) {
  let verticesCount = 0;
  let geometriesCount = 0;
  const entries = new Array(features.length);

  // 1. Preprocess features and transform coordinates
  for (let i = 0; i < features.length; i++) {
    const geometry = features[i].getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();
    const stride = geometry.getStride();

    verticesCount += flatCoordinates.length / stride;
    geometriesCount += ends.length;

    const pixelCoordinates = new Array(flatCoordinates.length);
    transform2D(flatCoordinates, 0, flatCoordinates.length, stride, transform, pixelCoordinates, stride);

    // Precompute loop status for each segment (성능 최적)
    const isLoop = ends.map((end, idx) => {
      const start = idx > 0 ? ends[idx - 1] : 0;
      const count = (end - start) / stride;
      if (count < 3) return false;
      const first = start, last = end - stride;
      return flatCoordinates[first] === flatCoordinates[last] && 
             flatCoordinates[first + 1] === flatCoordinates[last + 1];
    });

    entries[i] = { flatCoordinates, pixelCoordinates, ends, stride, isLoop };
  }

  // 2. Prepare render buffer
  const totalInstructionsCount = 
    7 * verticesCount + 
    (1 + getCustomAttributesSize(customAttributes)) * geometriesCount;
  if (!renderInstructions || renderInstructions.length !== totalInstructionsCount) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }

  // 3. Optimized angle calculation
  const ANGLE_COSINE_CUTOFF = Math.cos(10 * Math.PI / 180); // ≈0.985
  const angleBetween = (p0, pA, pB) => {
    const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
    const bx = pB[0] - p0[0], by = pB[1] - p0[1];
    const magA = ax * ax + ay * ay;
    const magB = bx * bx + by * by;
    if (magA < 1e-12 || magB < 1e-12) return 0;
    const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    return angle < 0 ? angle + 2 * Math.PI : angle;
  };

  // 4. Coordinate access helpers
  const createCoordinateHelpers = (flatCoordinates, stride, offset) => ({
    getCoord: (vertexIdx) => {
      const idx = offset + vertexIdx * stride;
      return [flatCoordinates[idx], flatCoordinates[idx + 1]];
    },
    getM: (vertexIdx) => {
      const idx = offset + vertexIdx * stride;
      return stride > 2 ? flatCoordinates[idx + 2] : 0;
    }
  });

  // 5. Main processing loop
  let renderIndex = 0;
  let refCounter = 0;

  for (const { flatCoordinates, pixelCoordinates, ends, stride, isLoop } of entries) {
    refCounter++;
    let offset = 0;
    let loopIndex = 0;

    for (const end of ends) {
      // Add custom attributes
      renderIndex += pushCustomAttributesInRenderInstructionsFromFeatures(
        renderInstructions, customAttributes, entries[refCounter - 1], renderIndex, refCounter
      );

      const verticesInLine = (end - offset) / stride;
      renderInstructions[renderIndex++] = verticesInLine;
      const segmentIsLoop = isLoop[loopIndex++];

      const { getCoord, getM } = createCoordinateHelpers(flatCoordinates, stride, offset);
      let currentLength = 0;
      let currentAngleTangentSum = 0;

      for (let i = 0; i < verticesInLine; i++) {
        const pixelIndex = offset + i * stride;
        const current = getCoord(i);

        // Calculate angles
        let angle0 = -1, angle1 = -1;
        let newAngleTangentSum = currentAngleTangentSum;

        if (i > 0) {
          const prev = getCoord(i - 1);
          const next = i < verticesInLine - 1 ? getCoord(i + 1) : (segmentIsLoop ? getCoord(1) : null);
          if (next) {
            angle0 = angleBetween(current, next, prev);
            if (Math.cos(angle0) <= ANGLE_COSINE_CUTOFF) {
              newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
            }
          }
        } else if (segmentIsLoop && verticesInLine > 2) {
          const prev = getCoord(verticesInLine - 2);
          const next = getCoord(1);
          angle0 = angleBetween(current, next, prev);
          if (Math.cos(angle0) <= ANGLE_COSINE_CUTOFF) {
            newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
          }
        }

        if (i < verticesInLine - 1) {
          const next = getCoord(i + 1);
          const after = i < verticesInLine - 2 ? getCoord(i + 2) : (segmentIsLoop ? getCoord(1) : null);
          if (after) {
            angle1 = angleBetween(next, current, after);
            if (Math.cos(angle1) <= ANGLE_COSINE_CUTOFF) {
              newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
            }
          }
        } else if (segmentIsLoop && verticesInLine > 2 && i === verticesInLine - 1) {
          const next = getCoord(1);
          const after = getCoord(2);
          angle1 = angleBetween(next, current, after);
          if (Math.cos(angle1) <= ANGLE_COSINE_CUTOFF) {
            newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
          }
        }

        // Store in buffer
        renderInstructions[renderIndex++] = pixelCoordinates[pixelIndex];
        renderInstructions[renderIndex++] = pixelCoordinates[pixelIndex + 1];
        renderInstructions[renderIndex++] = getM(i);
        renderInstructions[renderIndex++] = angle0;
        renderInstructions[renderIndex++] = angle1;
        renderInstructions[renderIndex++] = currentLength;
        renderInstructions[renderIndex++] = currentAngleTangentSum;

        // Update length
        if (i < verticesInLine - 1) {
          const next = getCoord(i + 1);
          currentLength += Math.sqrt(
            (next[0] - current[0]) * (next[0] - current[0]) +
            (next[1] - current[1]) * (next[1] - current[1])
          );
        }

        currentAngleTangentSum = newAngleTangentSum;
      }
      offset = end;
    }
  }

  return renderInstructions;
}
