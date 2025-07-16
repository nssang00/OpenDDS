function generateLineStringRenderInstructionsFromFeatures(
  features,
  renderInstructions,
  customAttributes,
  transform
) {
  let totalVertexCount = 0;
  let totalGeomCount = 0;
  const geometryRenderEntries = new Array(features.length);

  // 1. world좌표 준비
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();
    const stride = geometry.getStride();

    totalVertexCount += flatCoordinates.length / stride;
    totalGeomCount += ends.length;

    // world 좌표 변환
    const worldCoordinates = new Array(flatCoordinates.length);
    transform2D(flatCoordinates, 0, flatCoordinates.length, stride, transform, worldCoordinates, stride);

    geometryRenderEntries[i] = { feature, flatCoordinates, worldCoordinates, ends, stride };
  }

  // vertex별 기록: [x, y, m, angle0, angle1, currentLength, tangentSum, ...customAttrs]
  const customAttrsSize = getCustomAttributesSize(customAttributes);
  const floatsPerVertex = 3 + 4 + customAttrsSize; // x,y,m + angle0,angle1,len,sum
  let totalVertices = 0;
  for (const entry of geometryRenderEntries) {
    for (let ei = 0; ei < entry.ends.length; ei++) {
      const start = ei === 0 ? 0 : entry.ends[ei - 1];
      const end = entry.ends[ei];
      totalVertices += (end - start) / entry.stride;
    }
  }
  const totalInstructionsCount = floatsPerVertex * totalVertices;
  if (!renderInstructions || renderInstructions.length !== totalInstructionsCount) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }

  let renderIndex = 0;
  let refCounter = 0;

  // 2. 각 선형에 대해 각 vertex의 angle/length/tangentsum 계산해서 renderInstructions에 기록
  for (const entry of geometryRenderEntries) {
    ++refCounter;
    const stride = entry.stride;
    for (let ei = 0; ei < entry.ends.length; ei++) {
      const start = ei === 0 ? 0 : entry.ends[ei - 1];
      const end = entry.ends[ei];
      const vertexCount = (end - start) / stride;
      if (vertexCount < 2) continue;
      let tangentSum = 0;
      let lengthSum = 0;

      // world좌표만 추출
      const verts = [];
      for (let vi = start; vi < end; vi += stride) {
        verts.push([
          entry.worldCoordinates[vi],
          entry.worldCoordinates[vi + 1],
          stride > 2 ? entry.worldCoordinates[vi + 2] : 0,
        ]);
      }

      for (let i = 0; i < vertexCount; ++i) {
        // 자기 자신, 이전, 다음 인덱스
        const prevIdx = (i === 0) ? (vertexCount - 2) : i - 1;
        const nextIdx = (i === vertexCount - 1) ? 1 : i + 1;
        const p0 = verts[i];
        const pPrev = (i === 0) ? verts[vertexCount - 2] : verts[i - 1];
        const pNext = (i === vertexCount - 1) ? verts[1] : verts[i + 1];

        // angle0/angle1 계산
        let angle0 = 0, angle1 = 0;
        if (i > 0) {
          angle0 = angleBetween(p0, verts[i], pPrev);
          if (Math.cos(angle0) <= 0.985) tangentSum += Math.tan((angle0 - Math.PI) / 2);
        }
        if (i < vertexCount - 1) {
          angle1 = angleBetween(p0, verts[i], pNext);
          if (Math.cos(angle1) <= 0.985) tangentSum += Math.tan((Math.PI - angle1) / 2);
        }

        // 길이계산 (segment 누적)
        if (i > 0) {
          const dx = p0[0] - verts[i - 1][0], dy = p0[1] - verts[i - 1][1];
          lengthSum += Math.sqrt(dx * dx + dy * dy);
        }

        // renderInstructions 기록
        renderInstructions[renderIndex++] = p0[0]; // x
        renderInstructions[renderIndex++] = p0[1]; // y
        renderInstructions[renderIndex++] = p0[2]; // m(있으면), 없으면 0

        renderInstructions[renderIndex++] = angle0;
        renderInstructions[renderIndex++] = angle1;
        renderInstructions[renderIndex++] = lengthSum;
        renderInstructions[renderIndex++] = tangentSum;

        // customAttributes (기존 함수 활용)
        renderIndex += pushCustomAttributesInRenderInstructionsFromFeatures(
          renderInstructions,
          customAttributes,
          entry,
          renderIndex,
          refCounter
        );
      }
    }
  }
  return renderInstructions;
}

// angleBetween 그대로 사용
function angleBetween(p0, pA, pB) {
  const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
  const bx = pB[0] - p0[0], by = pB[1] - p0[1];
  if ((ax * ax + ay * ay) < 1e-12 || (bx * bx + by * by) < 1e-12) return 0;
  const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
  return angle < 0 ? angle + 2 * Math.PI : angle;
}
function generateLineStringBuffers_(renderInstructions, customAttributesSize) {
  // floatsPerVertex는 위에서 쓴 것과 동일해야 함!
  const floatsPerVertex = 3 + 4 + customAttributesSize;
  const vertexCount = renderInstructions.length / floatsPerVertex;
  // (indices/vertexAttribute는 기존 코드 그대로)
  return {
    indicesBuffer : new Uint32Array([0, 1, 3, 1, 2, 3]),
    vertexAttributesBuffer : new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
    instanceAttributesBuffer : renderInstructions, // 그대로 전달
  };
}
