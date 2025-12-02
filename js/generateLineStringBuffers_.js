function generateLineStringBuffers_(renderInstructions, customAttributesSize, transform, features) {
  const customAttrsCount = customAttributesSize;
  const instructionsPerVertex = 3;

  // 1. 전체 버퍼 크기 계산 (segment count)
  let currentInstructionsIndex = 0;
  let totalSegments = 0;
  while (currentInstructionsIndex < renderInstructions.length) {
    // 커스텀 속성 스킵
    currentInstructionsIndex += customAttrsCount;

    // 정점 개수
    const verticesCount = renderInstructions[currentInstructionsIndex++];
    // 세그먼트 개수 = 정점 개수 - 1
    totalSegments += (verticesCount - 1);

    // 해당 LineString의 모든 vertex instruction 스킵
    currentInstructionsIndex += verticesCount * instructionsPerVertex;
  }

  const floatsPerSegment =
    2 + // p0(x, y)
    2 + // p1(x, y)
    2 + // angle0, angle1
    1 + // currentLength
    1 + // currentAngleTangentSum
    customAttrsCount; // custom attributes

  const totalFloats = totalSegments * floatsPerSegment;
  const instanceAttributes = new Float32Array(totalFloats);
  let instanceOffset = 0;

  // ⚠ transform/invertTransform 로직 제거: features의 world 좌표를 직접 사용
  currentInstructionsIndex = 0;
  let featureIndex = 0;

  // 2. 인스트럭션 순회 및 버퍼 채우기
  while (currentInstructionsIndex < renderInstructions.length) {
    // 2-1. 커스텀 속성 파싱
    const customAttributes = [];
    for (let i = 0; i < customAttrsCount; ++i) {
      customAttributes[i] = renderInstructions[currentInstructionsIndex + i];
    }
    currentInstructionsIndex += customAttrsCount;

    // 2-2. 정점 개수
    const verticesCount = renderInstructions[currentInstructionsIndex++];

    // 2-3. features에서 원본 좌표 데이터 가져오기
    const feature = features ? features[featureIndex++] : null;
    const geometry = feature ? feature.getGeometry() : null;
    const flatCoords = geometry ? geometry.getFlatCoordinates() : null;
    const stride = geometry ? geometry.getStride() : 2;

    // 헬퍼 함수: flatCoords에서 [x, y] world 좌표를 가져오기
    function getWorldCoordFromFeature(offset) {
      // offset은 0부터 verticesCount-1까지의 정점 인덱스
      if (
        offset === null ||
        offset < 0 ||
        offset >= verticesCount ||
        !flatCoords
      ) {
        return null;
      }

      const base = offset * stride;
      return [flatCoords[base], flatCoords[base + 1]];
    }

    const firstInstructionsIndex = currentInstructionsIndex;
    const lastInstructionsIndex =
      currentInstructionsIndex + (verticesCount - 1) * instructionsPerVertex;

    // 화면 좌표 기준으로 루프 여부 판단
    const isLoop =
      renderInstructions[firstInstructionsIndex] ===
        renderInstructions[lastInstructionsIndex] &&
      renderInstructions[firstInstructionsIndex + 1] ===
        renderInstructions[lastInstructionsIndex + 1];

    let currentLength = 0;
    let currentAngleTangentSum = 0;

    // 각도 계산 함수 (p0: 기준점, pA: 다음 점, pB: 이전 점)
    function angleBetween(p0, pA, pB) {
      const ax = pA[0] - p0[0];
      const ay = pA[1] - p0[1];
      const bx = pB[0] - p0[0];
      const by = pB[1] - p0[1];

      if (ax * ax + ay * ay < 1e-12 || bx * bx + by * by < 1e-12) {
        return 0;
      }

      const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
      return angle < 0 ? angle + 2 * Math.PI : angle;
    }

    // 3. 세그먼트 단위로 인스턴스 데이터 생성
    for (let i = 0; i < verticesCount - 1; ++i) {
      // 3-1. 이전(before) 및 다음 다음(after) 정점 인덱스 (정점 순서 기준)
      let beforeIdx = null;
      if (i > 0) {
        beforeIdx = i - 1;
      } else if (isLoop) {
        beforeIdx = verticesCount - 2;
      }

      let afterIdx = null;
      if (i < verticesCount - 2) {
        afterIdx = i + 2;
      } else if (isLoop) {
        afterIdx = 1;
      }

      // 3-2. 화면 좌표 (p0, p1) - renderInstructions 기준
      const segmentStartIndex =
        currentInstructionsIndex + i * instructionsPerVertex;
      const segmentEndIndex =
        currentInstructionsIndex + (i + 1) * instructionsPerVertex;

      const p0 = [
        renderInstructions[segmentStartIndex],
        renderInstructions[segmentStartIndex + 1],
      ];
      const p1 = [
        renderInstructions[segmentEndIndex],
        renderInstructions[segmentEndIndex + 1],
      ];

      // 원본(world) 좌표 인덱스 (idx0, idx1)
      const idx0 = i;
      const idx1 = i + 1;

      // 3-3. world 좌표 가져오기 (거리/각도 계산용)
      const pBworld = getWorldCoordFromFeature(beforeIdx);
      const p0world = getWorldCoordFromFeature(idx0);
      const p1world = getWorldCoordFromFeature(idx1);
      const pAworld = getWorldCoordFromFeature(afterIdx);

      // 3-4. 각도 계산 및 tangent sum 누적
      let angle0 = -1;
      let angle1 = -1;
      let newAngleTangentSum = currentAngleTangentSum;

      if (pBworld && p0world && p1world) {
        angle0 = angleBetween(p0world, p1world, pBworld);
        // LINESTRING_ANGLE_COSINE_CUTOFF = 0.985
        if (Math.cos(angle0) <= 0.985) {
          newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
        }
      }

      if (pAworld && p0world && p1world) {
        angle1 = angleBetween(p1world, p0world, pAworld);
        if (Math.cos(angle1) <= 0.985) {
          newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
        }
      }

      // 3-5. 인스턴스 버퍼 채우기 (GPU 렌더링용)
      instanceAttributes[instanceOffset++] = p0[0];
      instanceAttributes[instanceOffset++] = p0[1];
      instanceAttributes[instanceOffset++] = p1[0];
      instanceAttributes[instanceOffset++] = p1[1];
      instanceAttributes[instanceOffset++] = angle0;
      instanceAttributes[instanceOffset++] = angle1;
      instanceAttributes[instanceOffset++] = currentLength;
      instanceAttributes[instanceOffset++] = currentAngleTangentSum;

      for (let j = 0; j < customAttrsCount; ++j) {
        instanceAttributes[instanceOffset++] = customAttributes[j];
      }

      // 3-6. 길이 누적 (world 좌표 기준)
      if (p0world && p1world) {
        // Math.hypot 사용 (sqrt(dx*dx + dy*dy)와 동일)
        currentLength += Math.hypot(
          p1world[0] - p0world[0],
          p1world[1] - p0world[1],
        );
      }

      currentAngleTangentSum = newAngleTangentSum;
    }

    // 4. 다음 LineString 인스트럭션으로 이동
    currentInstructionsIndex += verticesCount * instructionsPerVertex;
  }

  // 5. 정적 인덱스/정점 버퍼와 인스턴스 버퍼 반환
  return {
    indicesBuffer: new Uint32Array([0, 1, 3, 1, 2, 3]),
    vertexAttributesBuffer: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
    instanceAttributesBuffer: instanceAttributes,
  };
}
