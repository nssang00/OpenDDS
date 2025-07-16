function generateLineStringRenderInstructionsFromFeatures(
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
    
    // Store both pixel and world coordinates
    geometryRenderEntries[i] = { 
      feature, 
      pixelCoordinates, 
      worldCoordinates: flatCoordinates.slice(), // Copy of original world coords
      ends 
    };
  }

  // Calculate total instruction count:
  // 5 values per vertex (px, py, m, worldx, worldy)
  // + 1 per geometry for vertex count
  // + custom attributes per geometry
  const totalInstructionsCount =
    5 * verticesCount +
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
    const feature = entry.feature;
    const stride = feature.stride_;    
    const worldCoords = entry.worldCoordinates;
    
    ++refCounter;
    let offset = 0;

    for (const end of entry.ends) {
      // Push custom attributes
      renderIndex += pushCustomAttributesInRenderInstructionsFromFeatures(
        renderInstructions,
        customAttributes,
        entry,
        renderIndex,
        refCounter
      );
      
      // Push vertex count for this geometry part
      const vertexCount = (end - offset) / stride;
      renderInstructions[renderIndex++] = vertexCount;

      // Precompute world-space values for the entire segment
      const segmentWorldCoords = [];
      for (let i = offset; i < end; i += stride) {
        segmentWorldCoords.push(
          worldCoords[i], 
          worldCoords[i + 1]
        );
      }

      // Precompute angles and cumulative values
      const { angles, cumulativeLengths, tangentSums } = 
        precomputeWorldValues(segmentWorldCoords, vertexCount);
      
      // Store vertex data with both pixel and world information
      for (let i = 0; i < vertexCount; i++) {
        const srcIdx = offset + i * stride;
        
        // Pixel coordinates
        renderInstructions[renderIndex++] = entry.pixelCoordinates[srcIdx];     // px
        renderInstructions[renderIndex++] = entry.pixelCoordinates[srcIdx + 1]; // py
        renderInstructions[renderIndex++] = stride === 3 ? 
          entry.pixelCoordinates[srcIdx + 2] : 0; // m
        
        // World coordinates and precomputed values
        renderInstructions[renderIndex++] = cumulativeLengths[i] || 0; // cumulativeLength
        renderInstructions[renderIndex++] = tangentSums[i] || 0;       // currentAngleTangentSum
      }
      offset = end;
    }
  }
  
  return renderInstructions;
}

// Helper to precompute world-space values
function precomputeWorldValues(coords, vertexCount) {
  const angles = new Array(vertexCount).fill(-1);
  const cumulativeLengths = new Array(vertexCount).fill(0);
  const tangentSums = new Array(vertexCount).fill(0);
  
  let totalLength = 0;
  let totalTangentSum = 0;
  
  // Compute angles between segments
  for (let i = 1; i < vertexCount - 1; i++) {
    const p0 = [coords[(i-1)*2], coords[(i-1)*2 + 1]];
    const p1 = [coords[i*2], coords[i*2 + 1]];
    const p2 = [coords[(i+1)*2], coords[(i+1)*2 + 1]];
    
    angles[i] = angleBetween(p0, p1, p2);
  }
  
  // Compute cumulative lengths and tangent sums
  for (let i = 0; i < vertexCount - 1; i++) {
    const p0 = [coords[i*2], coords[i*2 + 1]];
    const p1 = [coords[(i+1)*2], coords[(i+1)*2 + 1]];
    
    // Segment length
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const length = Math.sqrt(dx*dx + dy*dy);
    
    // Update cumulative length
    totalLength += length;
    cumulativeLengths[i + 1] = totalLength;
    
    // Update tangent sum if angle exists
    if (i > 0 && angles[i] !== -1) {
      const angle = angles[i];
      if (Math.cos(angle) <= 0.985) {
        totalTangentSum += Math.tan((angle - Math.PI) / 2);
      }
    }
    tangentSums[i + 1] = totalTangentSum;
  }
  
  return { angles, cumulativeLengths, tangentSums };
}

// Angle calculation helper
function angleBetween(p0, p1, p2) {
  const ax = p0[0] - p1[0], ay = p0[1] - p1[1];
  const bx = p2[0] - p1[0], by = p2[1] - p1[1];
  
  const dot = ax * bx + ay * by;
  const cross = ax * by - ay * bx;
  return Math.atan2(cross, dot);
}

// Optimized buffer generation (no world transforms needed)
function generateLineStringBuffers_(renderInstructions, customAttributesSize) {
  const customAttrsCount = customAttributesSize;
  const instructionsPerVertex = 5; // px, py, m, cumLength, tangentSum

  let currentInstructionsIndex = 0;
  let totalSegments = 0;
  
  // First pass: count total segments
  while (currentInstructionsIndex < renderInstructions.length) {
    currentInstructionsIndex += customAttrsCount;
    const verticesCount = renderInstructions[currentInstructionsIndex++];
    totalSegments += verticesCount - 1;
    currentInstructionsIndex += verticesCount * instructionsPerVertex;
  }

  // Prepare buffer
  const floatsPerSegment =
    2 +                // p0(x, y)
    1 +                // m0
    2 +                // p1(x, y)
    1 +                // m1
    1 +                // cumulativeLength
    1 +                // currentAngleTangentSum
    customAttrsCount;  // customAttrs

  const totalFloats = totalSegments * floatsPerSegment;
  const instanceAttributes = new Float32Array(totalFloats);
  let bufferPos = 0;

  // Second pass: fill segment data
  currentInstructionsIndex = 0;
  while (currentInstructionsIndex < renderInstructions.length) {
    // Read custom attributes
    const customAttributes = [];
    for (let i = 0; i < customAttrsCount; ++i) {
      customAttributes[i] = renderInstructions[currentInstructionsIndex++];
    }
    
    // Read vertex count
    const verticesCount = renderInstructions[currentInstructionsIndex++];
    const vertexBase = currentInstructionsIndex;
    
    // Process segments
    for (let i = 0; i < verticesCount - 1; i++) {
      const idx0 = vertexBase + i * instructionsPerVertex;
      const idx1 = vertexBase + (i + 1) * instructionsPerVertex;
      
      // Extract point data
      const p0x = renderInstructions[idx0];
      const p0y = renderInstructions[idx0 + 1];
      const m0 = renderInstructions[idx0 + 2];
      const cumLength0 = renderInstructions[idx0 + 3];
      const tangentSum0 = renderInstructions[idx0 + 4];
      
      const p1x = renderInstructions[idx1];
      const p1y = renderInstructions[idx1 + 1];
      const m1 = renderInstructions[idx1 + 2];
      const cumLength1 = renderInstructions[idx1 + 3];
      const tangentSum1 = renderInstructions[idx1 + 4];
      
      // Write segment data to buffer
      instanceAttributes[bufferPos++] = p0x;
      instanceAttributes[bufferPos++] = p0y;
      instanceAttributes[bufferPos++] = m0;
      instanceAttributes[bufferPos++] = p1x;
      instanceAttributes[bufferPos++] = p1y;
      instanceAttributes[bufferPos++] = m1;
      instanceAttributes[bufferPos++] = cumLength0;
      instanceAttributes[bufferPos++] = tangentSum0;
      
      // Copy custom attributes
      for (let j = 0; j < customAttrsCount; j++) {
        instanceAttributes[bufferPos++] = customAttributes[j];
      }
    }
    
    // Move to next geometry
    currentInstructionsIndex += verticesCount * instructionsPerVertex;
  }

  return {
    indicesBuffer: new Uint32Array([0, 1, 3, 1, 2, 3]),
    vertexAttributesBuffer: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
    instanceAttributesBuffer: instanceAttributes,
  };
}
