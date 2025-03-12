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
  features,//kmg
) {
  //kmg
  let features2 = [];
  for (const featureUid in batch.entries) {
    const batchEntry = batch.entries[featureUid];
    features2.push(batchEntry.feature);
  }
  
  let verticesCount = 0;
  let geometriesCount = 0;
  for (const feature of features2) {
    const geometry = feature.getGeometry();
    verticesCount += geometry.getFlatCoordinates().length / geometry.getStride();
    geometriesCount += geometry.getEnds().length;
  }
  
  const totalInstructionsCount2 =
    3 * verticesCount + (1 + getCustomAttributesSize(customAttributes)) * geometriesCount;
  
  const flatCoords2 = [];
  let renderIndex2 = 0;
  let renderInstructions2 = new Float32Array(totalInstructionsCount2);
  
  for (const feature of features2) {
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const stride = geometry.getStride();
    const ends = geometry.getEnds();
  
    flatCoords2.length = flatCoordinates.length;
    transform2D(
      flatCoordinates,
      0,
      flatCoords2.length,
      stride,
      transform,
      flatCoords2,
      stride,
    );
  
    let offset = 0;
    for (let i = 0, ii = ends.length; i < ii; i++) {
      let end = ends[i];
  
      for (const key in customAttributes) {
        const attr = customAttributes[key];
        const value = attr.callback(feature);
        const size = attr.size ?? 1;
  
        for (let j = 0; j < size; j++) {
          renderInstructions2[renderIndex2++] = value[j] ?? value;
        }
      }
  
      // vertices count
      renderInstructions2[renderIndex2++] = (end - offset) / stride;

      for (let j = offset; j < end; j += stride) {
        renderInstructions2[renderIndex2++] = flatCoords2[j];
        renderInstructions2[renderIndex2++] = flatCoords2[j + 1]; 
        renderInstructions2[renderIndex2++] = stride === 3 ? flatCoords2[j + 2] : 0;
      }
  
      offset = end;
    }
  }
  //////////

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
  features,//kmg
) {
  //kmg
  let features2 = [];
  for (const featureUid in batch.entries) {
    const batchEntry = batch.entries[featureUid];
    features2.push(batchEntry.feature);
  }
  
  let verticesCount = 0;
  let geometriesCount = 0;
  let ringsCount = 0;
  
  for (const feature of features2) {
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const ends = geometry.getEnds();
    const multiPolygonEndss = inflateEnds(flatCoordinates, ends);
    if (multiPolygonEndss.length > 1) {
      for (let i = 0, ii = multiPolygonEndss.length; i < ii; i++) {
        let polygonEnds = multiPolygonEndss[i];
        const prevPolygonEnds = i > 0 ? multiPolygonEndss[i - 1] : null;
        const startIndex = prevPolygonEnds
          ? prevPolygonEnds[prevPolygonEnds.length - 1]
          : 0;
        const endIndex = polygonEnds[polygonEnds.length - 1];
        polygonEnds =
          startIndex > 0
            ? polygonEnds.map((end) => end - startIndex)
            : polygonEnds;
            /*
        this.addCoordinates_(
          'Polygon',
          flatCoords.slice(startIndex, endIndex),
          polygonEnds,
          feature,
          featureUid,
          stride,
          layout,
        );*/
      }
    }





    verticesCount += geometry.getFlatCoordinates().length / geometry.getStride();
    geometriesCount++;
    ringsCount += ends.length;
  }
  console.log('polygon', features, features2);


/////////////

  const totalInstructionsCount2 =
    2 * verticesCount +
    (1 + getCustomAttributesSize(customAttributes)) * geometriesCount +
    ringsCount;

  const flatCoords2 = [];
  let renderIndex2 = 0;
  let renderInstructions2 = new Float32Array(totalInstructionsCount2);

  for (const feature of features2) {
    const geometry = feature.getGeometry();
    const flatCoordinates = geometry.getFlatCoordinates();
    const stride = geometry.getStride();
    const ends = geometry.getEnds();

    flatCoords2.length = flatCoordinates.length;
    transform2D(
      flatCoordinates,
      0,
      flatCoordinates.length,//flatCoords2.length,
      stride,
      transform,
      flatCoords2,
      stride,
    );

    for (const key in customAttributes) {
      const attr = customAttributes[key];
      const value = attr.callback.call({ref:1}, feature);
      const size = attr.size ?? 1;

      for (let j = 0; j < size; j++) {
        renderInstructions2[renderIndex2++] = value[j] ?? value;
      }
    }

    const ringsVerticesCount = ends.map((end, ind, arr) =>
      ind > 0 ? (end - arr[ind - 1]) / stride : end / stride,
    );
    // ring count
    renderInstructions2[renderIndex2++] = ringsVerticesCount.length;

    // vertices count in each ring
    for (let j = 0, jj = ringsVerticesCount.length; j < jj; j++) {
      renderInstructions2[renderIndex2++] = ringsVerticesCount[j];
    }

    let offset = 0;    
    for(let i = 0, ii = ends.length; i < ii; i++) {
      let end = ends[i];

      // looping on points for positions
      for (let j = offset; j < end; j += stride) {
        renderInstructions2[renderIndex2++] = flatCoords2[j]; 
        renderInstructions2[renderIndex2++] = flatCoords2[j + 1];
      }
      offset = end;
    }
  }

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
  console.log('renderinstruction', features, totalInstructionsCount, totalInstructionsCount2, renderIndex, renderIndex2)
  return renderInstructions2;
}
