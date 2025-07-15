// 수정된 generateBuffersFromFeatures 메서드
async generateBuffersFromFeatures(features, transform) {
  console.time("generateBuffersFromFeatures");
  const filteredFeatures = features;
  
  const featuresBatch = {
    polygonFeatures: [],
    lineStringFeatures: [],
    pointFeatures: []
  };

  for(const feature of filteredFeatures) {
    const geometryType = feature.getGeometry().getType();
    if(geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
      featuresBatch.polygonFeatures.push(feature);
      if(this.hasStroke_)
        featuresBatch.lineStringFeatures.push(feature);
    } else if(geometryType === 'LineString' || geometryType === 'MultiLineString') {
      featuresBatch.lineStringFeatures.push(feature);
    } else if(geometryType === 'Point' || geometryType === 'MultiPoint') {
      featuresBatch.pointFeatures.push(feature);
    }
  }
  
  if (featuresBatch.polygonFeatures.length === 0 && 
    featuresBatch.lineStringFeatures.length === 0 && 
    featuresBatch.pointFeatures.length === 0) {
    return null;
  }

  console.timeEnd("generateBuffersFromFeatures");

  const label = `generateBuffersForType2_-${Date.now()}`;
  console.time(label);

  // 직접 features에서 버퍼 생성
  const polygonBuffers = this.hasFill_ 
    ? this.generateBuffersForType2_(featuresBatch.polygonFeatures, 'Polygon', transform)
    : null;

  const lineStringBuffers = this.hasStroke_
    ? this.generateBuffersForType2_(featuresBatch.lineStringFeatures, 'LineString', transform)
    : null;

  const pointBuffers = this.hasSymbol_
    ? this.generateBuffersForType2_(featuresBatch.pointFeatures, 'Point', transform)
    : null;

  const invertVerticesTransform = makeInverseTransform(createTransform(), transform);
  console.timeEnd(label);
  
  return {
    polygonBuffers: polygonBuffers,
    lineStringBuffers: lineStringBuffers,
    pointBuffers: pointBuffers,
    invertVerticesTransform: invertVerticesTransform,
  };
}

// 수정된 generateBuffersForType2_ 메서드 - features를 직접 받음
generateBuffersForType2_(features, geometryType, transform) {
  if (!features || features.length === 0) return null;

  let buffers;
  switch (geometryType) {
    case 'Point':
      buffers = this.generatePointBuffersFromFeatures_(features, transform);
      break;
    case 'LineString':
      buffers = this.generateLineStringBuffersFromFeatures_(features, transform);
      break;
    case 'Polygon':
      buffers = this.generatePolygonBuffersFromFeatures_(features, transform);
      break;
    default:
      return null;
  }

  const indicesBuffer = new WebGLArrayBuffer(ELEMENT_ARRAY_BUFFER, DYNAMIC_DRAW);
  indicesBuffer.setArray(buffers.indicesBuffer);
  const vertexAttributesBuffer = new WebGLArrayBuffer(ARRAY_BUFFER, DYNAMIC_DRAW);
  vertexAttributesBuffer.setArray(buffers.vertexAttributesBuffer);
  const instanceAttributesBuffer = new WebGLArrayBuffer(ARRAY_BUFFER, DYNAMIC_DRAW)
  instanceAttributesBuffer.setArray(buffers.instanceAttributesBuffer);

  this.helper_.flushBufferData(indicesBuffer);
  this.helper_.flushBufferData(vertexAttributesBuffer);
  this.helper_.flushBufferData(instanceAttributesBuffer);

  return [
    indicesBuffer,
    vertexAttributesBuffer,
    instanceAttributesBuffer,
  ];
}

// Point 버퍼를 features에서 직접 생성
generatePointBuffersFromFeatures_(features, transform) {
  const customAttributesSize = getCustomAttributesSize(this.customAttributes_);
  const elementCount = features.length;
  
  const instanceAttributes = new Float32Array(
    elementCount * (2 + customAttributesSize)
  );

  let bufferPosition = 0;
  let refCounter = 0;
  
  for (const feature of features) {
    ++refCounter;
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const stride = geometry.getStride();
    for (let i = 0; i < flatCoordinates.length; i += stride) {
      // 좌표 변환
      const pixelX = transform[0] * flatCoordinates[i] + transform[2] * flatCoordinates[i+1] + transform[4];
      const pixelY = transform[1] * flatCoordinates[i] + transform[3] * flatCoordinates[i+1] + transform[5];
      instanceAttributes[bufferPosition++] = pixelX;
      instanceAttributes[bufferPosition++] = pixelY;
      // 커스텀 속성
      for (const key in this.customAttributes_) {
        const attr = this.customAttributes_[key];
        const value = attr.callback.call({ ref: refCounter }, feature);
        const size = attr.size ?? 1;
        for (let i = 0; i < size; i++) {
          instanceAttributes[bufferPosition++] = (value && value[i] != null) ? value[i] : 0;
        }
      }
    }
  }
  

  return {
    indicesBuffer: new Uint32Array([0, 1, 3, 1, 2, 3]),
    vertexAttributesBuffer: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
    instanceAttributesBuffer: instanceAttributes,
  };
}

// LineString 버퍼를 features에서 직접 생성
generateLineStringBuffersFromFeatures_(features, transform) {
  const customAttrsCount = getCustomAttributesSize(this.customAttributes_);
  const instructionsPerVertex = 3; // x, y, m

  // 총 세그먼트 수 계산
  let totalSegments = 0;
  for (const feature of features) {
    const geometry = feature.getGeometry();
    const ends = geometry.getEnds();
    const stride = geometry.getStride();
    const flatCoordinates = geometry.getFlatCoordinates();
    
    for (const end of ends) {
      const verticesCount = end / stride;
      totalSegments += Math.max(0, verticesCount - 1);
    }
  }

  const floatsPerSegment = 10 + customAttrsCount;
  const totalFloats = totalSegments * floatsPerSegment;
  const instanceAttributes = new Float32Array(totalFloats);
  let bufferPos = 0;

  const invertTransform = createTransform();
  makeInverseTransform(invertTransform, transform);

  let refCounter = 0;
  
  for (const feature of features) {
    ++refCounter;
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();
    const stride = geometry.getStride();
    
    // 좌표 변환
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
    
    // 커스텀 속성 가져오기
    const customAttributes = [];
    for (const key in this.customAttributes_) {
      const attr = this.customAttributes_[key];
      const value = attr.callback.call({ ref: refCounter }, feature);
      const size = attr.size ?? 1;
      for (let i = 0; i < size; i++) {
        customAttributes.push((value && value[i] != null) ? value[i] : 0);
      }
    }

    let offset = 0;
    for (const end of ends) {
      const verticesCount = (end - offset) / stride;
      
      if (verticesCount < 2) {
        offset = end;
        continue;
      }
      
      // 루프 검사
      const firstIndex = offset;
      const lastIndex = end - stride;
      const isLoop = 
        pixelCoordinates[firstIndex] === pixelCoordinates[lastIndex] &&
        pixelCoordinates[firstIndex + 1] === pixelCoordinates[lastIndex + 1];

      let currentLength = 0;
      let currentAngleTangentSum = 0;

      for (let i = 0; i < verticesCount - 1; i++) {
        const segmentStartIndex = offset + i * stride;
        const segmentEndIndex = offset + (i + 1) * stride;
        
        const p0 = [pixelCoordinates[segmentStartIndex], pixelCoordinates[segmentStartIndex + 1]];
        const p1 = [pixelCoordinates[segmentEndIndex], pixelCoordinates[segmentEndIndex + 1]];
        const m0 = stride === 3 ? pixelCoordinates[segmentStartIndex + 2] : 0;
        const m1 = stride === 3 ? pixelCoordinates[segmentEndIndex + 2] : 0;

        // 각도 계산
        function angleBetween(p0, pA, pB) {
          const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
          const bx = pB[0] - p0[0], by = pB[1] - p0[1];
          if ((ax * ax + ay * ay) < 1e-12 || (bx * bx + by * by) < 1e-12) return 0;
          const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
          return angle < 0 ? angle + 2 * Math.PI : angle;
        }

        let angle0 = -1, angle1 = -1;
        let newAngleTangentSum = currentAngleTangentSum;
        
        // 이전 점 각도 계산
        if (i > 0) {
          const beforeIndex = offset + (i - 1) * stride;
          const pB = [pixelCoordinates[beforeIndex], pixelCoordinates[beforeIndex + 1]];
          angle0 = angleBetween(p0, p1, pB);
          if (Math.cos(angle0) <= 0.985) {
            newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
          }
        } else if (isLoop) {
          const beforeIndex = end - stride * 2;
          const pB = [pixelCoordinates[beforeIndex], pixelCoordinates[beforeIndex + 1]];
          angle0 = angleBetween(p0, p1, pB);
          if (Math.cos(angle0) <= 0.985) {
            newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
          }
        }
        
        // 다음 점 각도 계산
        if (i < verticesCount - 2) {
          const afterIndex = offset + (i + 2) * stride;
          const pA = [pixelCoordinates[afterIndex], pixelCoordinates[afterIndex + 1]];
          angle1 = angleBetween(p1, p0, pA);
          if (Math.cos(angle1) <= 0.985) {
            newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
          }
        } else if (isLoop) {
          const afterIndex = offset + stride;
          const pA = [pixelCoordinates[afterIndex], pixelCoordinates[afterIndex + 1]];
          angle1 = angleBetween(p1, p0, pA);
          if (Math.cos(angle1) <= 0.985) {
            newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
          }
        }

        // 버퍼에 데이터 저장
        instanceAttributes[bufferPos++] = p0[0];
        instanceAttributes[bufferPos++] = p0[1];
        instanceAttributes[bufferPos++] = m0;
        instanceAttributes[bufferPos++] = p1[0];
        instanceAttributes[bufferPos++] = p1[1];
        instanceAttributes[bufferPos++] = m1;
        instanceAttributes[bufferPos++] = angle0;
        instanceAttributes[bufferPos++] = angle1;
        instanceAttributes[bufferPos++] = currentLength;
        instanceAttributes[bufferPos++] = currentAngleTangentSum;
        
        for (let j = 0; j < customAttrsCount; j++) {
          instanceAttributes[bufferPos++] = customAttributes[j];
        }

        currentLength += Math.sqrt(
          (p1[0] - p0[0]) * (p1[0] - p0[0]) +
          (p1[1] - p0[1]) * (p1[1] - p0[1])
        );
        currentAngleTangentSum = newAngleTangentSum;
      }
      
      offset = end;
    }
  }

  return {
    indicesBuffer: new Uint32Array([0, 1, 3, 1, 2, 3]),
    vertexAttributesBuffer: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
    instanceAttributesBuffer: instanceAttributes,
  };
}

// Polygon 버퍼를 features에서 직접 생성
generatePolygonBuffersFromFeatures_(features, transform) {
  const customAttributesSize = getCustomAttributesSize(this.customAttributes_);

  // 총 정점 수와 인덱스 수 계산
  let totalVertices = 0;
  let maxTotalIndices = 0;
  
  for (const feature of features) {
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();
    const stride = geometry.getStride();
    
    const multiPolygonEnds = inflateEnds(flatCoordinates, ends);
    
    for (const polygonEnds of multiPolygonEnds) {
      let vertexCount = 0;
      for (let i = 0; i < polygonEnds.length; i++) {
        vertexCount += (polygonEnds[i] - (i === 0 ? 0 : polygonEnds[i - 1])) / stride;
      }
      totalVertices += vertexCount;
      maxTotalIndices += vertexCount * 3;
    }
  }

  const vertices = new Float32Array(totalVertices * (2 + customAttributesSize));
  const indices = new Uint32Array(maxTotalIndices);

  let vtxOffset = 0;
  let idxOffset = 0;
  let refCounter = 0;

  for (const feature of features) {
    ++refCounter;
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();
    const stride = geometry.getStride();
    
    // 좌표 변환
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
    
    // 커스텀 속성 가져오기
    const customAttrs = [];
    for (const key in this.customAttributes_) {
      const attr = this.customAttributes_[key];
      const value = attr.callback.call({ ref: refCounter }, feature);
      const size = attr.size ?? 1;
      for (let i = 0; i < size; i++) {
        customAttrs.push((value && value[i] != null) ? value[i] : 0);
      }
    }

    const multiPolygonEnds = inflateEnds(flatCoordinates, ends);
    let offset = 0;

    for (const polygonEnds of multiPolygonEnds) {
      // 홀 정보 계산
      const holes = [];
      let vertexCount = 0;
      for (let i = 0; i < polygonEnds.length; i++) {
        const ringVertexCount = (polygonEnds[i] - (i === 0 ? offset : polygonEnds[i - 1])) / stride;
        if (i > 0) holes.push(vertexCount);
        vertexCount += ringVertexCount;
      }

      // 좌표 추출 (stride 고려)
      const coords = [];
      for (let i = 0; i < vertexCount; i++) {
        coords.push(pixelCoordinates[offset + i * stride]);
        coords.push(pixelCoordinates[offset + i * stride + 1]);
      }

      // 삼각분할
      const triIndices = earcut(coords, holes, 2);

      // 버퍼에 정점 데이터 저장
      for (let i = 0; i < vertexCount; i++) {
        const base = (vtxOffset + i) * (2 + customAttributesSize);
        vertices[base + 0] = coords[i * 2];
        vertices[base + 1] = coords[i * 2 + 1];
        for (let j = 0; j < customAttributesSize; j++) {
          vertices[base + 2 + j] = customAttrs[j];
        }
      }
      
      // 인덱스 저장
      for (let i = 0; i < triIndices.length; i++) {
        indices[idxOffset + i] = triIndices[i] + vtxOffset;
      }
      
      vtxOffset += vertexCount;
      idxOffset += triIndices.length;
      offset += vertexCount * stride;
    }
  }

  return {
    indicesBuffer: (idxOffset < indices.length) ? indices.slice(0, idxOffset) : indices,
    vertexAttributesBuffer: vertices,
    instanceAttributesBuffer: new Float32Array([]),
  };
}

