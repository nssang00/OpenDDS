import earcut from 'earcut';

// 유틸: customAttributes 사이즈 구하기
function getCustomAttributesSize(customAttributes) {
  let size = 0;
  for (const key in customAttributes) {
    size += customAttributes[key].size ?? 1;
  }
  return size;
}

// 유틸: ends를 inflate해서 MultiPolygon 구조로
function inflateEnds(flatCoordinates, ends) {
  // OpenLayers 스타일. ends가 [10, 20, 40, 60, 90] 같은 경우
  // return [[10], [20, 40], [60, 90]];
  // 실제 구현은 쓰는 라이브러리/데이터 구조에 맞게 필요시 수정
  if (!Array.isArray(ends[0])) {
    // ends = [10, 20, 40, 60, 90] → 단일폴리곤 or 멀티폴리곤 flatten
    return [ends];
  }
  return ends; // 이미 2차원 배열이면 그대로
}

// 유틸: 2D Affine 변환
function transform2D(flatCoordinates, offset, end, stride, transform, dest, destStride) {
  let i = offset;
  let j = 0;
  while (i < end) {
    const x = flatCoordinates[i];
    const y = flatCoordinates[i + 1];
    dest[j]     = transform[0] * x + transform[2] * y + transform[4]; // x'
    dest[j + 1] = transform[1] * x + transform[3] * y + transform[5]; // y'
    if (stride > 2 && destStride > 2) dest[j + 2] = flatCoordinates[i + 2];
    i += stride;
    j += destStride;
  }
  return dest;
}

/////////////////////////////

// 1. Polygon (Multi 포함)
function generatePolygonBuffersFromFeatures(features, customAttributes, transform) {
  const customAttributesSize = getCustomAttributesSize(customAttributes);

  let totalVertices = 0, maxTotalIndices = 0;
  const perPolygon = [];

  // 1. geometry 구조 파악 및 카운트
  for (const feature of features) {
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();
    const stride = geometry.getStride();
    const multiPolygonEnds = inflateEnds(flatCoordinates, ends);

    for (const polygonEnds of multiPolygonEnds) {
      let rings = [];
      let vertexCount = 0;
      let offset = 0;
      for (let e of polygonEnds) {
        const cnt = (e - offset) / stride;
        rings.push(cnt);
        vertexCount += cnt;
        offset = e;
      }
      perPolygon.push({ feature, flatCoordinates, polygonEnds, stride, rings, vertexCount });
      totalVertices += vertexCount;
      maxTotalIndices += vertexCount * 3; // 충분히
    }
  }

  // 2. 버퍼 할당
  const vertices = new Float32Array(totalVertices * (2 + customAttributesSize));
  const indices = new Uint32Array(maxTotalIndices);

  let vtxOffset = 0, idxOffset = 0;
  for (const poly of perPolygon) {
    const { feature, flatCoordinates, polygonEnds, stride, rings, vertexCount } = poly;
    let offset = 0;
    // --- 변환 적용 ---
    const transformed = new Array(flatCoordinates.length);
    transform2D(flatCoordinates, 0, flatCoordinates.length, stride, transform, transformed, stride);

    // earcut에 넘길 coords/holes 계산
    const coords = [];
    const holes = [];
    let holeOffset = 0;
    for (let i = 0; i < rings.length; i++) {
      const ringStart = offset;
      for (let j = 0; j < rings[i]; j++) {
        coords.push(transformed[ringStart + j * stride]);
        coords.push(transformed[ringStart + j * stride + 1]);
        // 버퍼 채우기
        const base = (vtxOffset + (j + ringStart - offset)) * (2 + customAttributesSize);
        vertices[base + 0] = transformed[ringStart + j * stride];
        vertices[base + 1] = transformed[ringStart + j * stride + 1];
        let caIdx = 0;
        for (const key in customAttributes) {
          const attr = customAttributes[key];
          const value = attr.callback.call({}, feature);
          for (let sz = 0; sz < (attr.size ?? 1); sz++)
            vertices[base + 2 + caIdx++] = value?.[sz] ?? 0;
        }
      }
      if (i > 0) holes.push(holeOffset);
      holeOffset += rings[i];
      offset += rings[i] * stride;
    }
    // earcut triangulation
    const triIndices = earcut(coords, holes, 2);
    for (let i = 0; i < triIndices.length; ++i)
      indices[idxOffset + i] = triIndices[i] + vtxOffset;
    vtxOffset += vertexCount;
    idxOffset += triIndices.length;
  }

  return {
    indicesBuffer: (idxOffset < indices.length) ? indices.slice(0, idxOffset) : indices,
    vertexAttributesBuffer: vertices,
    instanceAttributesBuffer: new Float32Array([]),
  };
}

/////////////////////////////

// 2. LineString (Multi 포함)
function generateLineStringBuffersFromFeatures(features, customAttributes, transform) {
  const customAttrsCount = getCustomAttributesSize(customAttributes);

  let totalSegments = 0;
  const perLine = [];

  for (const feature of features) {
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();
    const stride = geometry.getStride();
    let offset = 0;
    for (let end of ends) {
      const vtxCount = (end - offset) / stride;
      totalSegments += vtxCount - 1;
      perLine.push({ feature, flatCoordinates, offset, end, stride });
      offset = end;
    }
  }

  const floatsPerSegment = 10 + customAttrsCount;
  const instanceAttributes = new Float32Array(totalSegments * floatsPerSegment);

  let bufferPos = 0;
  for (const entry of perLine) {
    const { feature, flatCoordinates, offset, end, stride } = entry;
    // --- 변환 미리 적용 ---
    const transformed = new Array(end - offset);
    transform2D(flatCoordinates, offset, end, stride, transform, transformed, stride);

    let currentLength = 0, currentAngleTangentSum = 0;
    const vtxCount = (end - offset) / stride;
    for (let i = 0; i < vtxCount - 1; i++) {
      const idx0 = i * stride;
      const idx1 = (i + 1) * stride;
      const x0 = transformed[idx0], y0 = transformed[idx0 + 1];
      const x1 = transformed[idx1], y1 = transformed[idx1 + 1];
      const m0 = stride === 3 ? transformed[idx0 + 2] : 0;
      const m1 = stride === 3 ? transformed[idx1 + 2] : 0;
      // (join/cap/angle 계산 필요하면 여기서 추가)

      instanceAttributes[bufferPos++] = x0;
      instanceAttributes[bufferPos++] = y0;
      instanceAttributes[bufferPos++] = m0;
      instanceAttributes[bufferPos++] = x1;
      instanceAttributes[bufferPos++] = y1;
      instanceAttributes[bufferPos++] = m1;
      // 나머지 (angle0, angle1, currentLength, currentAngleTangentSum 등) 예시로 0
      instanceAttributes[bufferPos++] = 0; // angle0
      instanceAttributes[bufferPos++] = 0; // angle1
      instanceAttributes[bufferPos++] = currentLength;
      instanceAttributes[bufferPos++] = currentAngleTangentSum;
      // customAttributes
      for (const key in customAttributes) {
        const attr = customAttributes[key];
        const value = attr.callback.call({}, feature);
        for (let sz = 0; sz < (attr.size ?? 1); sz++)
          instanceAttributes[bufferPos++] = value?.[sz] ?? 0;
      }
    }
  }

  return {
    indicesBuffer: new Uint32Array([0, 1, 3, 1, 2, 3]),
    vertexAttributesBuffer: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
    instanceAttributesBuffer: instanceAttributes,
  };
}

/////////////////////////////

// 3. Point (MultiPoint 포함)
function generatePointBuffersFromFeatures(features, customAttributes, transform) {
  const customAttributesSize = getCustomAttributesSize(customAttributes);

  let totalPoints = 0;
  const pointEntries = [];

  for (const feature of features) {
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const stride = geometry.getStride();
    totalPoints += flatCoordinates.length / stride;
    pointEntries.push({ feature, flatCoordinates, stride });
  }

  const instanceAttributes = new Float32Array(totalPoints * (2 + customAttributesSize));
  let bufferPosition = 0;
  for (const entry of pointEntries) {
    const { feature, flatCoordinates, stride } = entry;
    const transformed = new Array(flatCoordinates.length);
    transform2D(flatCoordinates, 0, flatCoordinates.length, stride, transform, transformed, stride);
    for (let i = 0; i < flatCoordinates.length; i += stride) {
      instanceAttributes[bufferPosition++] = transformed[i];
      instanceAttributes[bufferPosition++] = transformed[i + 1];
      for (const key in customAttributes) {
        const attr = customAttributes[key];
        const value = attr.callback.call({}, feature);
        const size = attr.size ?? 1;
        for (let j = 0; j < size; j++)
          instanceAttributes[bufferPosition++] = value?.[j] ?? 0;
      }
    }
  }

  return {
    indicesBuffer: new Uint32Array([0, 1, 3, 1, 2, 3]),
    vertexAttributesBuffer: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
    instanceAttributesBuffer: instanceAttributes,
  };
}

/////////////////////////////

// 🎯 통합 사용 예시
function generateAllBuffersFromFeatures(featuresBatch, customAttributes, transform) {
  return {
    polygonBuffers: generatePolygonBuffersFromFeatures(featuresBatch.polygonFeatures, customAttributes, transform),
    lineStringBuffers: generateLineStringBuffersFromFeatures(featuresBatch.lineStringFeatures, customAttributes, transform),
    pointBuffers: generatePointBuffersFromFeatures(featuresBatch.pointFeatures, customAttributes, transform),
    invertVerticesTransform: null // 필요시 추가
  };
}
