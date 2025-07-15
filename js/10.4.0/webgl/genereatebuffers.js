const label2 = `generateBuffersFromFeatures-${Date.now()}`;
console.time(label2);    
this.styleRenderer_
  .generateBuffersFromFeatures(features, transform)
  .then((buffers) => {
    this.buffers = buffers;
    console.timeEnd(label2);
    this.setReady();
  });

//kmg
  async generateBuffersFromFeatures(features, transform) {
    //if (geometryBatch.isEmpty()) {
    //  return null;
   // }
    console.time("generateBuffersFromFeatures");
    const filteredFeatures = features;
    //const renderInstructions = this.generateRenderInstructions_(geometryBatch, transform);
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
        } else {

        }   
      }
      if (featuresBatch.polygonFeatures.length === 0 && 
        featuresBatch.lineStringFeatures.length === 0 && 
        featuresBatch.pointFeatures.length === 0) {
        return null;
      }

        const renderInstructions = this.generateRenderInstructionsFromFeatures_(featuresBatch,transform);
    console.log("generateBuffersFromFeatures", renderInstructions)
    console.timeEnd("generateBuffersFromFeatures");

    const label = `generateBuffersForType2_-${Date.now()}`;
    console.time(label);

    const polygonBuffers = this.generateBuffersForType2_(
          renderInstructions.polygonInstructions,
          'Polygon', transform);

    const lineStringBuffers = this.generateBuffersForType2_(
          renderInstructions.lineStringInstructions,
          'LineString', transform);

    const pointBuffers = this.generateBuffersForType2_(
          renderInstructions.pointInstructions,
          'Point', transform);


    const invertVerticesTransform = makeInverseTransform(createTransform(), transform);
    console.timeEnd(label);
    
    return {
      polygonBuffers: polygonBuffers,
      lineStringBuffers: lineStringBuffers,
      pointBuffers: pointBuffers,
      invertVerticesTransform: invertVerticesTransform,
    };
  }

  generateBuffersForType2_(renderInstructions, geometryType, transform) {
    if (!renderInstructions) return null;

    let buffers;
    switch (geometryType) {
      case 'Point':
        buffers = this.generatePointBuffers_(renderInstructions);
        break;
      case 'LineString':
        buffers = this.generateLineStringBuffers_(renderInstructions, transform);
        break;
      case 'Polygon':
        buffers = this.generatePolygonBuffers_(renderInstructions);
        break;
      default:
        break;
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

  // Point buffer generation
  generatePointBuffers_(instructions) {
    const customAttributesSize = getCustomAttributesSize(this.customAttributes_);
    const instructionsPerElement = 2 + customAttributesSize;
    const elementCount = instructions.length / instructionsPerElement;
    
    const instanceAttributes = new Float32Array(
      elementCount * (2 + customAttributesSize)
    );

    let bufferPosition = 0;
    for (let i = 0; i < instructions.length; i += instructionsPerElement) {
      instanceAttributes[bufferPosition++] = instructions[i];     // x
      instanceAttributes[bufferPosition++] = instructions[i + 1]; // y
      
      for (let j = 0; j < customAttributesSize; j++) {
        instanceAttributes[bufferPosition++] = instructions[i + 2 + j];
      }
    }

    return {
      indicesBuffer : new Uint32Array([0, 1, 3, 1, 2, 3]),
      vertexAttributesBuffer : new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
      instanceAttributesBuffer : instanceAttributes,
    };

  }

  generateLineStringBuffers_(renderInstructions, transform) {
    const customAttrsCount = getCustomAttributesSize(this.customAttributes_);
    const instructionsPerVertex = 3; // x, y, m

    let currentInstructionsIndex = 0;
    let totalSegments = 0;
    while (currentInstructionsIndex < renderInstructions.length) {
      currentInstructionsIndex += customAttrsCount;
      const verticesCount = renderInstructions[currentInstructionsIndex++];
      totalSegments += (verticesCount - 1);
      currentInstructionsIndex += verticesCount * instructionsPerVertex;
    }

    const floatsPerSegment = 10 + customAttrsCount; // p0(x,y,m), p1(x,y,m), angle0, angle1, len, sum, ...custom
    const totalFloats = totalSegments * floatsPerSegment;
    const instanceAttributes = new Float32Array(totalFloats);
    let bufferPos = 0;

    const invertTransform = createTransform();
    makeInverseTransform(invertTransform, transform);

    currentInstructionsIndex = 0;
    while (currentInstructionsIndex < renderInstructions.length) {
      const customAttributes = [];
      for (let i = 0; i < customAttrsCount; ++i) {
        customAttributes[i] = renderInstructions[currentInstructionsIndex + i];
      }
      currentInstructionsIndex += customAttrsCount;
      const verticesCount = renderInstructions[currentInstructionsIndex++];

      const firstInstructionsIndex = currentInstructionsIndex;
      const lastInstructionsIndex = currentInstructionsIndex + (verticesCount - 1) * instructionsPerVertex;
      const isLoop =
        renderInstructions[firstInstructionsIndex] === renderInstructions[lastInstructionsIndex] &&
        renderInstructions[firstInstructionsIndex + 1] === renderInstructions[lastInstructionsIndex + 1];

      let currentLength = 0;
      let currentAngleTangentSum = 0;

      for (let i = 0; i < verticesCount - 1; i++) {
        let beforeIndex = null;
        if (i > 0) beforeIndex = currentInstructionsIndex + (i - 1) * instructionsPerVertex;
        else if (isLoop) beforeIndex = lastInstructionsIndex - instructionsPerVertex;
        let afterIndex = null;
        if (i < verticesCount - 2) afterIndex = currentInstructionsIndex + (i + 2) * instructionsPerVertex;
        else if (isLoop) afterIndex = firstInstructionsIndex + instructionsPerVertex;

        const segmentStartIndex = currentInstructionsIndex + i * instructionsPerVertex;
        const segmentEndIndex   = currentInstructionsIndex + (i + 1) * instructionsPerVertex;
        const p0 = [renderInstructions[segmentStartIndex], renderInstructions[segmentStartIndex + 1]];
        const p1 = [renderInstructions[segmentEndIndex],   renderInstructions[segmentEndIndex + 1]];
        const m0 = renderInstructions[segmentStartIndex + 2];
        const m1 = renderInstructions[segmentEndIndex + 2];
        const p0world = p0;//applyTransform(invertTransform, [...p0]);
        const p1world = p1;//applyTransform(invertTransform, [...p1]);

        function angleBetween(p0, pA, pB) {
          const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
          const bx = pB[0] - p0[0], by = pB[1] - p0[1];
          if ((ax * ax + ay * ay) < 1e-12 || (bx * bx + by * by) < 1e-12) return 0;
          const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
          return angle < 0 ? angle + 2 * Math.PI : angle;
        }

        let angle0 = -1, angle1 = -1;
        let newAngleTangentSum = currentAngleTangentSum;
        if (beforeIndex !== null) {
          const pB = [renderInstructions[beforeIndex], renderInstructions[beforeIndex + 1]];
          const pBworld = pB;//applyTransform(invertTransform, [...pB]);
          angle0 = angleBetween(p0world, p1world, pBworld);
          if (Math.cos(angle0) <= 0.985) {//LINESTRING_ANGLE_COSINE_CUTOFF
            newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
          }
        }
        if (afterIndex !== null) {
          const pA = [renderInstructions[afterIndex], renderInstructions[afterIndex + 1]];
          const pAworld = pA;//applyTransform(invertTransform, [...pA]);
          angle1 = angleBetween(p1world, p0world, pAworld);
          if (Math.cos(angle1) <= 0.985) {//LINESTRING_ANGLE_COSINE_CUTOFF
            newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
          }
        }

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
        for (let j = 0; j < customAttrsCount; ++j) {
          instanceAttributes[bufferPos++] = customAttributes[j];
        }

        currentLength += Math.sqrt(
          (p1world[0] - p0world[0]) * (p1world[0] - p0world[0]) +
          (p1world[1] - p0world[1]) * (p1world[1] - p0world[1])
        );
        currentAngleTangentSum = newAngleTangentSum;
      }
      currentInstructionsIndex += verticesCount * instructionsPerVertex;
    }

    return {
      indicesBuffer : new Uint32Array([0, 1, 3, 1, 2, 3]),
      vertexAttributesBuffer : new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
      instanceAttributesBuffer : instanceAttributes,
    };

  }
    

  generatePolygonBuffers_(instructions) {
    const customAttributesSize = getCustomAttributesSize(this.customAttributes_);

    let tmpIndex = 0, totalVertices = 0, maxTotalIndices = 0;
    const vertexCountsPerPolygon = [];
    while (tmpIndex < instructions.length) {
      tmpIndex += customAttributesSize;
      const ringCount = instructions[tmpIndex++];
      let vertexCount = 0;
      for (let i = 0; i < ringCount; ++i)
        vertexCount += instructions[tmpIndex++];
      tmpIndex += vertexCount * 2;
      totalVertices += vertexCount;
      vertexCountsPerPolygon.push(vertexCount);

      maxTotalIndices += vertexCount * 3;
    }

    const vertices = new Float32Array(totalVertices * (2 + customAttributesSize));
    const indices  = new Uint32Array(maxTotalIndices);

    let curInstruction = 0, vtxOffset = 0, idxOffset = 0, polyIdx = 0;
    while (curInstruction < instructions.length) {
      // Custom 속성 읽기
      const customAttrs = instructions.slice(curInstruction, curInstruction + customAttributesSize);
      curInstruction += customAttributesSize;

      // Ring 구조 파싱
      const ringCount = instructions[curInstruction++];
      const holes = [];
      let vertexCount = 0;
      const ringVertexCounts = [];
      for (let i = 0; i < ringCount; ++i) {
        const cnt = instructions[curInstruction++];
        if (i > 0) holes.push(vertexCount);
        vertexCount += cnt;
        ringVertexCounts.push(cnt);
      }

      // 좌표 추출
      const coords = instructions.slice(curInstruction, curInstruction + vertexCount * 2);
      curInstruction += vertexCount * 2;

      // Triangulate
      const triIndices = earcut(coords, holes, 2);

      // 버퍼에 직접 쓰기 (vertex)
      for (let i = 0; i < vertexCount; ++i) {
        const base = (vtxOffset + i) * (2 + customAttributesSize);
        vertices[base + 0] = coords[i * 2];
        vertices[base + 1] = coords[i * 2 + 1];
        for (let j = 0; j < customAttributesSize; ++j) {
          vertices[base + 2 + j] = customAttrs[j];
        }
      }
      // 인덱스 저장 (vertex 오프셋 적용)
      for (let i = 0; i < triIndices.length; ++i) {
        indices[idxOffset + i] = triIndices[i] + vtxOffset;
      }
      vtxOffset += vertexCount;
      idxOffset += triIndices.length;
      polyIdx++;
    }

    return {
      indicesBuffer : (idxOffset < indices.length) ? indices.slice(0, idxOffset) : indices,
      vertexAttributesBuffer : vertices,
      instanceAttributesBuffer : new Float32Array([]),
    };    
  }

  generateRenderInstructionsFromFeatures_(featuresBatch, transform) {
    const polygonInstructions = this.hasFill_
      ? generatePolygonRenderInstructionsFromFeatures(
          featuresBatch.polygonFeatures,
          new Float32Array(0),
          this.customAttributes_,
          transform,
        )
      : null;
    const lineStringInstructions = this.hasStroke_
      ? generateLineStringRenderInstructionsFromFeatures(
          featuresBatch.lineStringFeatures,
          new Float32Array(0),
          this.customAttributes_,
          transform,
        )
      : null;
    const pointInstructions = this.hasSymbol_
      ? generatePointRenderInstructionsFromFeatures(
          featuresBatch.pointFeatures,
          new Float32Array(0),
          this.customAttributes_,
          transform,
        )
      : null;

    return {
      polygonInstructions,
      lineStringInstructions,
      pointInstructions,
    };
  }    


  //////////////////////////
//kmg
export function generatePointRenderInstructionsFromFeatures(
  features,
  renderInstructions,
  customAttributes,
  transform,
) {
  let geometriesCount = 0;
  const geometryRenderEntries = [];

  for (const feature of features) {
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
  
    geometriesCount++;
  
    const pixelCoordinates = new Array(flatCoordinates.length);
    pixelCoordinates[0] = transform[0] * flatCoordinates[0] + transform[2] * flatCoordinates[1] + transform[4];
    pixelCoordinates[1] = transform[1] * flatCoordinates[0] + transform[3] * flatCoordinates[1] + transform[5];

    geometryRenderEntries.push({ feature, pixelCoordinates });
  }

  // here we anticipate the amount of render instructions for points:
  // 2 instructions per vertex for position (x and y)
  // + 1 instruction per vertex per custom attributes
  const totalInstructionsCount =
    (2 + getCustomAttributesSize(customAttributes)) * geometriesCount;
  if (
    !renderInstructions ||
    renderInstructions.length !== totalInstructionsCount
  ) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }    
  
  let renderIndex = 0;
  let refCounter = 0;
  for (const entry of geometryRenderEntries) {
    ++refCounter;

    renderInstructions[renderIndex++] = entry.pixelCoordinates[0];
    renderInstructions[renderIndex++] = entry.pixelCoordinates[1];
    for (const key in customAttributes) {
      const attr = customAttributes[key];
      const value = attr.callback.call({ ref: refCounter }, entry.feature);
      const size = attr.size ?? 1;
      for (let i = 0; i < size; i++) {
        renderInstructions[renderIndex++] = (value && value[i] != null) ? value[i] : 0;
      }
    }
  }
  return renderInstructions;
}

export function generateLineStringRenderInstructionsFromFeatures(
  features,
  renderInstructions,
  customAttributes,
  transform,
) {
  let verticesCount = 0;
  let geometriesCount = 0;
  
  const geometryRenderEntries = [];
  
  for (const feature of features) {
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
    geometryRenderEntries.push({ feature, pixelCoordinates, ends });
  }

  // here we anticipate the amount of render instructions for lines:
  // 3 instructions per vertex for position (x, y and m)
  // + 1 instruction per line per custom attributes
  // + 1 instruction per line (for vertices count)
  const totalInstructionsCount =
  3 * verticesCount +
  (1 + getCustomAttributesSize(customAttributes)) * geometriesCount;
  
  if (
    !renderInstructions ||
    renderInstructions.length !== totalInstructionsCount
  ) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }
  
  let renderIndex = 0;
  let refCounter = 0;
  
  for (const entry of geometryRenderEntries) {
    const stride = entry.feature.stride_;    
  
    ++refCounter;
    let offset = 0;
  
    for (const end of entry.ends) {
  
      for (const key in customAttributes) {
        const attr = customAttributes[key];
        const value = attr.callback.call({ ref: refCounter }, entry.feature);
        const size = attr.size ?? 1;
        for (let i = 0; i < size; i++) {
          renderInstructions[renderIndex++] = (value && value[i] != null) ? value[i] : 0;
        }
      }

      // vertices count
      renderInstructions[renderIndex++] = (end - offset) / stride;
  
      // looping on points for positions
      for (let i = offset; i < end; i += stride) {
        renderInstructions[renderIndex++] = entry.pixelCoordinates[i]; 
        renderInstructions[renderIndex++] = entry.pixelCoordinates[i + 1];
        renderInstructions[renderIndex++] = stride === 3 ? entry.pixelCoordinates[i + 2] : 0;
      }
      offset = end;
    }
  }  
  return renderInstructions;
}

export function generatePolygonRenderInstructionsFromFeatures(
  features,
  renderInstructions,
  customAttributes,
  transform,
) {
  let verticesCount = 0;
  let geometriesCount = 0;
  let ringsCount = 0;

  const geometryRenderEntries = [];

  for (const feature of features) {
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();
    const stride = geometry.getStride();

    verticesCount += flatCoordinates.length / stride;
    ringsCount += ends.length;

    const multiPolygonEnds = inflateEnds(flatCoordinates, ends);
    geometriesCount += multiPolygonEnds.length;

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
    geometryRenderEntries.push({ feature, pixelCoordinates, multiPolygonEnds });
  }

  // here we anticipate the amount of render instructions for polygons:
  // 2 instructions per vertex for position (x and y)
  // + 1 instruction per polygon per custom attributes
  // + 1 instruction per polygon (for vertices count in polygon)
  // + 1 instruction per ring (for vertices count in ring)
  const totalInstructionsCount =
    2 * verticesCount +
    (1 + getCustomAttributesSize(customAttributes)) * geometriesCount +
    ringsCount;

  if (
    !renderInstructions ||
    renderInstructions.length !== totalInstructionsCount
  ) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }

  let renderIndex = 0;
  let refCounter = 0;

  for (const entry of geometryRenderEntries) {
    const stride = entry.feature.stride_;    

    ++refCounter;
    let offset = 0;

    for (const polygonEnds of entry.multiPolygonEnds) {

      for (const key in customAttributes) {
        const attr = customAttributes[key];
        const value = attr.callback.call({ ref: refCounter }, entry.feature);
        const size = attr.size ?? 1;
        for (let i = 0; i < size; i++) {
          renderInstructions[renderIndex++] = (value && value[i] != null) ? value[i] : 0;
        }
      }

      // ring count
      const ringsVerticesCount = polygonEnds.length;
      renderInstructions[renderIndex++] = ringsVerticesCount;

      // vertices count in each ring
      for (let i = 0; i < ringsVerticesCount; i++) {
        renderInstructions[renderIndex++] =
          (polygonEnds[i] - (i === 0 ? offset : polygonEnds[i - 1])) / stride;
      }

      // looping on points for positions
      for (let i = 0; i < ringsVerticesCount; i++) {
        let end = polygonEnds[i];

        for (let j = offset; j < end; j += 2) {
          renderInstructions[renderIndex++] = entry.pixelCoordinates[j];
          renderInstructions[renderIndex++] = entry.pixelCoordinates[j + 1];
        }
        offset = end;
      }
    }
  }
  return renderInstructions;
}
