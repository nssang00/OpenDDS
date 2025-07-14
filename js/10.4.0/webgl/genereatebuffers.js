

generateBuffersForType_(renderInstructions, geometryType, transform) {
  if (!renderInstructions) return null;

  switch (geometryType) {
    case 'Point':
      return this.generatePointBuffers_(renderInstructions);
    case 'LineString':
      return this.generateLineStringBuffers_(renderInstructions, transform);
    case 'Polygon':
      return this.generatePolygonBuffers_(renderInstructions);
    default:
      return null;
  }
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
    // Position
    instanceAttributes[bufferPosition++] = instructions[i];     // x
    instanceAttributes[bufferPosition++] = instructions[i + 1]; // y
    
    // Custom attributes
    for (let j = 0; j < customAttributesSize; j++) {
      instanceAttributes[bufferPosition++] = instructions[i + 2 + j];
    }
  }

  return this.createBuffersForInstancedGeometry_(
    new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), // Quad vertices
    new Uint32Array([0, 1, 3, 1, 2, 3]),             // Quad indices
    instanceAttributes
  );
}

generateLineStringBuffers_(renderInstructions, transform) {
    const customAttrsCount = getCustomAttributesSize(this.customAttributes_);
    const instructionsPerVertex = 3; // x, y, m
    const instanceAttributes = [];
    
    const invertTransform = createTransform();
    makeInverseTransform(invertTransform, transform);
  
    let currentInstructionsIndex = 0;
    let verticesCount, customAttributes;
    while (currentInstructionsIndex < renderInstructions.length) {
      customAttributes = [];
      for (let i = 0; i < customAttrsCount; ++i) {
        customAttributes[i] = renderInstructions[currentInstructionsIndex + i];
      }   
      currentInstructionsIndex += customAttrsCount;
      verticesCount = renderInstructions[currentInstructionsIndex++];
  
      const firstInstructionsIndex = currentInstructionsIndex;
      const lastInstructionsIndex =
        currentInstructionsIndex +
        (verticesCount - 1) * instructionsPerVertex;
      const isLoop =
        renderInstructions[firstInstructionsIndex] ===
          renderInstructions[lastInstructionsIndex] &&
        renderInstructions[firstInstructionsIndex + 1] ===
          renderInstructions[lastInstructionsIndex + 1];
  
      let currentLength = 0;
      let currentAngleTangentSum = 0;
  
      // segment iteration
      for (let i = 0; i < verticesCount - 1; i++) {
        // === writeLineSegmentToBuffers inlined ===
        let beforeIndex = null;
        if (i > 0) {
          beforeIndex = currentInstructionsIndex + (i - 1) * instructionsPerVertex;
        } else if (isLoop) {
          beforeIndex = lastInstructionsIndex - instructionsPerVertex;
        }
        let afterIndex = null;
        if (i < verticesCount - 2) {
          afterIndex = currentInstructionsIndex + (i + 2) * instructionsPerVertex;
        } else if (isLoop) {
          afterIndex = firstInstructionsIndex + instructionsPerVertex;
        }
  
        // P0, P1
        const segmentStartIndex = currentInstructionsIndex + i * instructionsPerVertex;
        const segmentEndIndex = currentInstructionsIndex + (i + 1) * instructionsPerVertex;
        const p0 = [renderInstructions[segmentStartIndex], renderInstructions[segmentStartIndex + 1]];
        const p1 = [renderInstructions[segmentEndIndex], renderInstructions[segmentEndIndex + 1]];
        const m0 = renderInstructions[segmentStartIndex + 2];
        const m1 = renderInstructions[segmentEndIndex + 2];
  
        // toWorldTransform
        const p0world = applyTransform(invertTransform, [p0[0], p0[1]]);
        const p1world = applyTransform(invertTransform, [p1[0], p1[1]]);
  
        // join/cap angles
        function angleBetween(p0, pA, pB) {
          const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
          const bx = pB[0] - p0[0], by = pB[1] - p0[1];
          if ((ax * ax + ay * ay) < 1e-12 || (bx * bx + by * by) < 1e-12) return 0;
          const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
          return angle < 0 ? angle + 2 * Math.PI : angle;
        }
        let angle0 = -1, angle1 = -1;
        let newAngleTangentSum = currentAngleTangentSum;
  
        // joinBefore
        if (beforeIndex !== null) {
          const pB = [
            renderInstructions[beforeIndex],
            renderInstructions[beforeIndex + 1],
          ];
          const pBworld = applyTransform(invertTransform, [pB[0], pB[1]]);
          angle0 = angleBetween(p0world, p1world, pBworld);
          if (Math.cos(angle0) <= LINESTRING_ANGLE_COSINE_CUTOFF) {
            newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
          }
        }
        // joinAfter
        if (afterIndex !== null) {
          const pA = [
            renderInstructions[afterIndex],
            renderInstructions[afterIndex + 1],
          ];
          const pAworld = applyTransform(invertTransform, [pA[0], pA[1]]);
          angle1 = angleBetween(p1world, p0world, pAworld);
          if (Math.cos(angle1) <= LINESTRING_ANGLE_COSINE_CUTOFF) {
            newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
          }
        }
  
        // instanceAttributes push
        instanceAttributes.push(
          p0[0], p0[1], m0,
          p1[0], p1[1], m1,
          angle0, angle1,
          currentLength,
          currentAngleTangentSum,
          ...customAttributes
        );
  
        // segment length, angle
        currentLength += Math.sqrt(
          (p1world[0] - p0world[0]) * (p1world[0] - p0world[0]) +
          (p1world[1] - p0world[1]) * (p1world[1] - p0world[1])
        );
        currentAngleTangentSum = newAngleTangentSum;
      }
      currentInstructionsIndex += verticesCount * instructionsPerVertex;
    }
  
    return this.createBuffersForInstancedGeometry_(
      new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
      new Uint32Array([0, 1, 3, 1, 2, 3]),
      new Float32Array(instanceAttributes)
    );
  }
  

// Polygon buffer generation
generatePolygonBuffers_(instructions) {
  const customAttributesSize = getCustomAttributesSize(this.customAttributes_);
  const vertices = [];
  const indices = [];
  
  let currentIndex = 0;
  while (currentIndex < instructions.length) {
    const customAttrs = instructions.slice(
      currentIndex,
      currentIndex + customAttributesSize
    );
    currentIndex += customAttributesSize;
    
    const ringCount = instructions[currentIndex++];
    const holes = [];
    let vertexCount = 0;
    
    // Read ring vertex counts
    for (let i = 0; i < ringCount; i++) {
      const ringVertexCount = instructions[currentIndex++];
      if (i > 0) holes.push(vertexCount);
      vertexCount += ringVertexCount;
    }
    
    // Extract polygon coordinates
    const coords = instructions.slice(
      currentIndex,
      currentIndex + vertexCount * 2
    );
    currentIndex += vertexCount * 2;
    
    // Triangulate polygon
    const triIndices = earcut(coords, holes, 2);
    
    // Create vertices with custom attributes
    for (let i = 0; i < coords.length; i += 2) {
      vertices.push(coords[i], coords[i + 1], ...customAttrs);
    }
    
    // Offset indices for current polygon
    const indexOffset = vertices.length / (2 + customAttributesSize) - vertexCount;
    for (const index of triIndices) {
      indices.push(index + indexOffset);
    }
  }

  return [
    new WebGLArrayBuffer(ELEMENT_ARRAY_BUFFER, DYNAMIC_DRAW).fromArray(indices),
    new WebGLArrayBuffer(ARRAY_BUFFER, DYNAMIC_DRAW).fromArray(vertices),
    new WebGLArrayBuffer(ARRAY_BUFFER, DYNAMIC_DRAW) // Empty instance buffer
  ];
}

// Helper to create instanced geometry buffers
createBuffersForInstancedGeometry_(vertexData, indexData, instanceData) {
  return [
    new WebGLArrayBuffer(ELEMENT_ARRAY_BUFFER, DYNAMIC_DRAW).fromArray(indexData),
    new WebGLArrayBuffer(ARRAY_BUFFER, DYNAMIC_DRAW).fromArray(vertexData),
    new WebGLArrayBuffer(ARRAY_BUFFER, DYNAMIC_DRAW).fromArray(instanceData)
  ];
}
