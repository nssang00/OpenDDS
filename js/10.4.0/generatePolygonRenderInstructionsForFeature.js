export function generatePolygonRenderInstructionsForFeature(
  features,
  renderInstructions,
  customAttributes,
  transform,
) {
  let totalVertices = 0;
  let totalGeometries = 0;
  let totalRings = 0;

  // Calculate total vertices, geometries, and rings
  for (const feature of features) {
    const geometry = feature.getGeometry();
    if (geometry.getType() === 'Polygon') {
      totalGeometries++;
      const ends = geometry.getEnds();
      totalRings += ends.length;
      totalVertices += geometry.getFlatCoordinates().length / 2; // Stride is 2 for polygons
    } else if (geometry.getType() === 'MultiPolygon') {
      const endss = geometry.getEndss();
      const flatCoords = geometry.getFlatCoordinates();
      let previousEnd = 0;
      for (const polygonEnds of endss) {
        const polygonLastEnd = polygonEnds[polygonEnds.length - 1];
        const polygonCoordsLength = polygonLastEnd - previousEnd;
        totalGeometries++;
        totalRings += polygonEnds.length;
        totalVertices += polygonCoordsLength / 2;
        previousEnd = polygonLastEnd;
      }
    }
  }

  const customAttributesSize = getCustomAttributesSize(customAttributes);
  const totalInstructionsCount =
    2 * totalVertices +
    (1 + customAttributesSize) * totalGeometries +
    totalRings;

  if (!renderInstructions || renderInstructions.length !== totalInstructionsCount) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }

  let renderIndex = 0;

  for (const feature of features) {
    const geometry = feature.getGeometry();
    if (geometry.getType() === 'Polygon') {
      const flatCoordinates = geometry.getFlatCoordinates();
      const ends = geometry.getEnds();
      const stride = geometry.getStride();

      // Transform coordinates
      const flatCoords2 = [];
      transform2D(
        flatCoordinates,
        0,
        flatCoordinates.length,
        stride,
        transform,
        flatCoords2,
        2 // Output stride for x, y
      );

      // Calculate ringsVerticesCounts
      const ringsVerticesCounts = [];
      let prevEnd = 0;
      for (const end of ends) {
        const count = (end - prevEnd) / stride;
        ringsVerticesCounts.push(count);
        prevEnd = end;
      }

      // Push custom attributes
      for (const key in customAttributes) {
        const attr = customAttributes[key];
        const value = attr.callback(feature);
        const size = attr.size ?? 1;
        for (let j = 0; j < size; j++) {
          renderInstructions[renderIndex++] = Array.isArray(value) ? value[j] : value;
        }
      }

      // Push ring count
      renderInstructions[renderIndex++] = ringsVerticesCounts.length;

      // Push each ring's vertex count
      for (const count of ringsVerticesCounts) {
        renderInstructions[renderIndex++] = count;
      }

      // Push coordinates (x, y)
      for (let j = 0; j < flatCoords2.length; j += 2) {
        renderInstructions[renderIndex++] = flatCoords2[j];
        renderInstructions[renderIndex++] = flatCoords2[j + 1];
      }
    } else if (geometry.getType() === 'MultiPolygon') {
      const endss = geometry.getEndss();
      const multiFlatCoords = geometry.getFlatCoordinates();
      const stride = geometry.getStride();
      let previousEndGlobal = 0;

      for (const polygonEnds of endss) {
        const polygonLastEnd = polygonEnds[polygonEnds.length - 1];
        const polygonFlatCoords = multiFlatCoords.slice(
          previousEndGlobal,
          polygonLastEnd
        );

        // Adjust ends to be relative to the current polygon
        const adjustedEnds = polygonEnds.map(end => end - previousEndGlobal);

        // Transform coordinates
        const flatCoords2 = [];
        transform2D(
          polygonFlatCoords,
          0,
          polygonFlatCoords.length,
          stride,
          transform,
          flatCoords2,
          2 // Output stride for x, y
        );

        // Calculate ringsVerticesCounts for current polygon
        const ringsVerticesCounts = [];
        let prevEndLocal = 0;
        for (const end of adjustedEnds) {
          const count = (end - prevEndLocal) / stride;
          ringsVerticesCounts.push(count);
          prevEndLocal = end;
        }

        // Push custom attributes (same feature for each polygon in MultiPolygon)
        for (const key in customAttributes) {
          const attr = customAttributes[key];
          const value = attr.callback(feature);
          const size = attr.size ?? 1;
          for (let j = 0; j < size; j++) {
            renderInstructions[renderIndex++] = Array.isArray(value) ? value[j] : value;
          }
        }

        // Push ring count
        renderInstructions[renderIndex++] = ringsVerticesCounts.length;

        // Push each ring's vertex count
        for (const count of ringsVerticesCounts) {
          renderInstructions[renderIndex++] = count;
        }

        // Push coordinates (x, y)
        for (let j = 0; j < flatCoords2.length; j += 2) {
          renderInstructions[renderIndex++] = flatCoords2[j];
          renderInstructions[renderIndex++] = flatCoords2[j + 1];
        }

        previousEndGlobal = polygonLastEnd;
      }
    }
  }

  return renderInstructions;
}
