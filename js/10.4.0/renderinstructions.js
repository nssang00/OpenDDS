/**
 * @module ol/render/webgl/renderinstructions
 */
import {transform2D} from '../../geom/flat/transform.js';
import {apply as applyTransform} from '../../transform.js';

//kmg
import {inflateEnds} from '../../geom/flat/orient.js';

/**
 * @param {Float32Array} renderInstructions Render instructions
 * @param {import('./VectorStyleRenderer.js').AttributeDefinitions} customAttributes Custom attributes
 * @param {import("./MixedGeometryBatch.js").GeometryBatchItem} batchEntry Batch item
 * @param {number} currentIndex Current index
 * @return {number} The amount of values pushed
 */
function pushCustomAttributesInRenderInstructions(
  renderInstructions,
  customAttributes,
  batchEntry,
  currentIndex,
) {
  let shift = 0;
  for (const key in customAttributes) {
    const attr = customAttributes[key];
    const value = attr.callback.call(batchEntry, batchEntry.feature);
    renderInstructions[currentIndex + shift++] = value?.[0] ?? value;
    if (!attr.size || attr.size === 1) {
      continue;
    }
    renderInstructions[currentIndex + shift++] = value[1];
    if (attr.size < 3) {
      continue;
    }
    renderInstructions[currentIndex + shift++] = value[2];
    if (attr.size < 4) {
      continue;
    }
    renderInstructions[currentIndex + shift++] = value[3];
  }
  return shift;
}

/**
 * @param {import('./VectorStyleRenderer.js').AttributeDefinitions} customAttributes Custom attributes
 * @return {number} Cumulated size of all attributes
 */
export function getCustomAttributesSize(customAttributes) {
  return Object.keys(customAttributes).reduce(
    (prev, curr) => prev + (customAttributes[curr].size || 1),
    0,
  );
}

/**
 * Render instructions for lines are structured like so:
 * [ x0, y0, customAttr0, ... , xN, yN, customAttrN ]
 * @param {import("./MixedGeometryBatch.js").PointGeometryBatch} batch Point geometry batch
 * @param {Float32Array} renderInstructions Render instructions
 * @param {import('./VectorStyleRenderer.js').AttributeDefinitions} customAttributes Custom attributes
 * @param {import("../../transform.js").Transform} transform Transform to apply to coordinates
 * @return {Float32Array} Generated render instructions
 */
export function generatePointRenderInstructions(
  batch,
  renderInstructions,
  customAttributes,
  transform,
) {
  // here we anticipate the amount of render instructions for points:
  // 2 instructions per vertex for position (x and y)
  // + 1 instruction per vertex per custom attributes
  const totalInstructionsCount =
    (2 + getCustomAttributesSize(customAttributes)) * batch.geometriesCount;
  if (
    !renderInstructions ||
    renderInstructions.length !== totalInstructionsCount
  ) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }

  // loop on features to fill the render instructions
  const tmpCoords = [];
  let renderIndex = 0;
  for (const featureUid in batch.entries) {
    const batchEntry = batch.entries[featureUid];
    for (let i = 0, ii = batchEntry.flatCoordss.length; i < ii; i++) {
      tmpCoords[0] = batchEntry.flatCoordss[i][0];
      tmpCoords[1] = batchEntry.flatCoordss[i][1];
      applyTransform(transform, tmpCoords);

      renderInstructions[renderIndex++] = tmpCoords[0];
      renderInstructions[renderIndex++] = tmpCoords[1];
      renderIndex += pushCustomAttributesInRenderInstructions(
        renderInstructions,
        customAttributes,
        batchEntry,
        renderIndex,
      );
    }
  }
  return renderInstructions;
}

/**
 * Render instructions for lines are structured like so:
 * [ customAttr0, ... , customAttrN, numberOfVertices0, x0, y0, ... , xN, yN, numberOfVertices1, ... ]
 * @param {import("./MixedGeometryBatch.js").LineStringGeometryBatch} batch Line String geometry batch
 * @param {Float32Array} renderInstructions Render instructions
 * @param {import('./VectorStyleRenderer.js').AttributeDefinitions} customAttributes Custom attributes
 * @param {import("../../transform.js").Transform} transform Transform to apply to coordinates
 * @return {Float32Array} Generated render instructions
 */
export function generateLineStringRenderInstructions(
  batch,
  renderInstructions,
  customAttributes,
  transform,
) {
  // here we anticipate the amount of render instructions for lines:
  // 3 instructions per vertex for position (x, y and m)
  // + 1 instruction per line per custom attributes
  // + 1 instruction per line (for vertices count)
  const totalInstructionsCount =
    3 * batch.verticesCount +
    (1 + getCustomAttributesSize(customAttributes)) * batch.geometriesCount;
  if (
    !renderInstructions ||
    renderInstructions.length !== totalInstructionsCount
  ) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }

  // loop on features to fill the render instructions
  const flatCoords = [];
  let renderIndex = 0;
  for (const featureUid in batch.entries) {
    const batchEntry = batch.entries[featureUid];
    for (let i = 0, ii = batchEntry.flatCoordss.length; i < ii; i++) {
      flatCoords.length = batchEntry.flatCoordss[i].length;
      transform2D(
        batchEntry.flatCoordss[i],
        0,
        flatCoords.length,
        3,
        transform,
        flatCoords,
        3,
      );
      renderIndex += pushCustomAttributesInRenderInstructions(
        renderInstructions,
        customAttributes,
        batchEntry,
        renderIndex,
      );

      // vertices count
      renderInstructions[renderIndex++] = flatCoords.length / 3;

      // looping on points for positions
      for (let j = 0, jj = flatCoords.length; j < jj; j += 3) {
        renderInstructions[renderIndex++] = flatCoords[j];
        renderInstructions[renderIndex++] = flatCoords[j + 1];
        renderInstructions[renderIndex++] = flatCoords[j + 2];
      }
    }
  }
  return renderInstructions;
}

/**
 * Render instructions for polygons are structured like so:
 * [ customAttr0, ..., customAttrN, numberOfRings, numberOfVerticesInRing0, ..., numberOfVerticesInRingN, x0, y0, ..., xN, yN, numberOfRings,... ]
 * @param {import("./MixedGeometryBatch.js").PolygonGeometryBatch} batch Polygon geometry batch
 * @param {Float32Array} renderInstructions Render instructions
 * @param {import('./VectorStyleRenderer.js').AttributeDefinitions} customAttributes Custom attributes
 * @param {import("../../transform.js").Transform} transform Transform to apply to coordinates
 * @return {Float32Array} Generated render instructions
 */
export function generatePolygonRenderInstructions(
  batch,
  renderInstructions,
  customAttributes,
  transform,
) {
  // here we anticipate the amount of render instructions for polygons:
  // 2 instructions per vertex for position (x and y)
  // + 1 instruction per polygon per custom attributes
  // + 1 instruction per polygon (for vertices count in polygon)
  // + 1 instruction per ring (for vertices count in ring)
  const totalInstructionsCount =
    2 * batch.verticesCount +
    (1 + getCustomAttributesSize(customAttributes)) * batch.geometriesCount +
    batch.ringsCount;
  if (
    !renderInstructions ||
    renderInstructions.length !== totalInstructionsCount
  ) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }

  // loop on features to fill the render instructions
  const flatCoords = [];
  let renderIndex = 0;
  for (const featureUid in batch.entries) {
    const batchEntry = batch.entries[featureUid];
    for (let i = 0, ii = batchEntry.flatCoordss.length; i < ii; i++) {
      flatCoords.length = batchEntry.flatCoordss[i].length;
      transform2D(
        batchEntry.flatCoordss[i],
        0,
        flatCoords.length,
        2,
        transform,
        flatCoords,
      );
      renderIndex += pushCustomAttributesInRenderInstructions(
        renderInstructions,
        customAttributes,
        batchEntry,
        renderIndex,
      );

      // ring count
      renderInstructions[renderIndex++] =
        batchEntry.ringsVerticesCounts[i].length;

      // vertices count in each ring
      for (
        let j = 0, jj = batchEntry.ringsVerticesCounts[i].length;
        j < jj;
        j++
      ) {
        renderInstructions[renderIndex++] =
          batchEntry.ringsVerticesCounts[i][j];
      }

      // looping on points for positions
      for (let j = 0, jj = flatCoords.length; j < jj; j += 2) {
        renderInstructions[renderIndex++] = flatCoords[j];
        renderInstructions[renderIndex++] = flatCoords[j + 1];
      }
    }
  }
  return renderInstructions;
}

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
        renderInstructions[renderIndex++] = value[i] ?? value;
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
          renderInstructions[renderIndex++] = value[i] ?? value;
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
          renderInstructions[renderIndex++] = value[i] ?? value;
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
