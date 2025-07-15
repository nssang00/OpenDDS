    const label2 = `generateBuffersFromFeatures-${Date.now()}`;
    console.time(label2);    
    this.styleRenderer_
      .generateBuffersFromFeatures(features, transform)
      .then((buffers) => {
        this.buffers = buffers;
        console.timeEnd(label2);
        this.setReady();
      });

//////////

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
