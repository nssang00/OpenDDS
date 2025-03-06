import {transform2D} from '../../geom/flat/transform.js';
import {apply as applyTransform} from '../../transform.js';
import LineString from '../../geom/LineString.js';
import MultiLineString from '../../geom/MultiLineString.js';
import Polygon from '../../geom/Polygon.js';
import MultiPolygon from '../../geom/MultiPolygon.js';
import Point from '../../geom/Point.js';
import MultiPoint from '../../geom/MultiPoint.js';

/**
 * Push custom attribute values into render instructions array
 * @param {Float32Array} renderInstructions Target array for render instructions
 * @param {import('./VectorStyleRenderer.js').AttributeDefinitions} customAttributes Attribute definitions
 * @param {import("../../Feature.js").Feature} feature Source feature
 * @param {number} currentIndex Current write position
 * @return {number} Number of values written
 */
function pushCustomAttributesInRenderInstructions(
  renderInstructions,
  customAttributes,
  feature,
  currentIndex
) {
  let offset = 0;
  for (const key in customAttributes) {
    const attr = customAttributes[key];
    const value = attr.callback(feature, feature.getProperties());
    renderInstructions[currentIndex + offset++] = value?.[0] ?? value;
    
    if (attr.size > 1) {
      for (let i = 1; i < attr.size; i++) {
        renderInstructions[currentIndex + offset++] = value?.[i] ?? 0;
      }
    }
  }
  return offset;
}

/**
 * Generate point render instructions for features
 * @param {Array<import("../../Feature.js").Feature>} features Array of features
 * @param {Float32Array} renderInstructions Existing render instructions (reused if possible)
 * @param {import('./VectorStyleRenderer.js').AttributeDefinitions} customAttributes Custom attributes
 * @param {import("../../transform.js").Transform} transform Coordinate transform
 * @return {Float32Array} Generated render instructions
 */
export function generatePointRenderInstructionsForFeatures(
  features,
  renderInstructions,
  customAttributes,
  transform
) {
  // Calculate total required buffer size
  let totalVertices = 0;
  for (const feature of features) {
    const geom = feature.getGeometry();
    if (geom instanceof Point) {
      totalVertices++;
    } else if (geom instanceof MultiPoint) {
      totalVertices += geom.getCoordinates().length;
    }
  }
  
  const attrSize = getCustomAttributesSize(customAttributes);
  const totalSize = totalVertices * (2 + attrSize);
  
  if (!renderInstructions || renderInstructions.length !== totalSize) {
    renderInstructions = new Float32Array(totalSize);
  }

  let idx = 0;
  const tmpCoords = [0, 0];
  
  for (const feature of features) {
    const geom = feature.getGeometry();
    if (!geom) continue;

    if (geom instanceof Point) {
      tmpCoords[0] = geom.getFlatCoordinates()[0];
      tmpCoords[1] = geom.getFlatCoordinates()[1];
      applyTransform(transform, tmpCoords);
      
      renderInstructions[idx++] = tmpCoords[0];
      renderInstructions[idx++] = tmpCoords[1];
      idx += pushCustomAttributesInRenderInstructions(
        renderInstructions, customAttributes, feature, idx
      );
    }
    else if (geom instanceof MultiPoint) {
      const coords = geom.getFlatCoordinates();
      const stride = geom.getStride();
      
      for (let i = 0; i < coords.length; i += stride) {
        tmpCoords[0] = coords[i];
        tmpCoords[1] = coords[i + 1];
        applyTransform(transform, tmpCoords);
        
        renderInstructions[idx++] = tmpCoords[0];
        renderInstructions[idx++] = tmpCoords[1];
        idx += pushCustomAttributesInRenderInstructions(
          renderInstructions, customAttributes, feature, idx
        );
      }
    }
  }
  
  return renderInstructions;
}

/**
 * Generate linestring render instructions for features
 * @param {Array<import("../../Feature.js").Feature>} features Array of features
 * @param {Float32Array} renderInstructions Existing render instructions (reused if possible)
 * @param {import('./VectorStyleRenderer.js').AttributeDefinitions} customAttributes Custom attributes
 * @param {import("../../transform.js").Transform} transform Coordinate transform
 * @return {Float32Array} Generated render instructions
 */
export function generateLineStringRenderInstructionsForFeatures(
  features,
  renderInstructions,
  customAttributes,
  transform
) {
  // Calculate total required buffer size
  let totalVertices = 0;
  let totalLines = 0;
  
  for (const feature of features) {
    const geom = feature.getGeometry();
    if (!geom) continue;

    if (geom instanceof LineString) {
      totalVertices += geom.getFlatCoordinates().length;
      totalLines++;
    }
    else if (geom instanceof MultiLineString) {
      const ends = geom.getEnds();
      totalLines += ends.length;
      totalVertices += geom.getFlatCoordinates().length;
    }
  }

  const attrSize = getCustomAttributesSize(customAttributes);
  const totalSize = totalLines * (1 + attrSize) + totalVertices;
  
  if (!renderInstructions || renderInstructions.length !== totalSize) {
    renderInstructions = new Float32Array(totalSize);
  }

  let idx = 0;
  
  for (const feature of features) {
    const geom = feature.getGeometry();
    if (!geom) continue;

    const processLine = (flatCoords) => {
      // Push attributes
      idx += pushCustomAttributesInRenderInstructions(
        renderInstructions, customAttributes, feature, idx
      );
      
      // Push vertex count
      const vertexCount = flatCoords.length / geom.getStride();
      renderInstructions[idx++] = vertexCount;
      
      // Transform and push coordinates
      transform2D(
        flatCoords,
        0,
        flatCoords.length,
        geom.getStride(),
        transform,
        renderInstructions,
        idx
      );
      idx += flatCoords.length;
    };

    if (geom instanceof LineString) {
      processLine(geom.getFlatCoordinates());
    }
    else if (geom instanceof MultiLineString) {
      const flatCoords = geom.getFlatCoordinates();
      const ends = geom.getEnds();
      let offset = 0;
      
      for (const end of ends) {
        const lineCoords = flatCoords.slice(offset, end);
        processLine(lineCoords);
        offset = end;
      }
    }
  }
  
  return renderInstructions;
}

/**
 * Generate polygon render instructions for features
 * @param {Array<import("../../Feature.js").Feature>} features Array of features
 * @param {Float32Array} renderInstructions Existing render instructions (reused if possible)
 * @param {import('./VectorStyleRenderer.js').AttributeDefinitions} customAttributes Custom attributes
 * @param {import("../../transform.js").Transform} transform Coordinate transform
 * @return {Float32Array} Generated render instructions
 */
export function generatePolygonRenderInstructionsForFeatures(
  features,
  renderInstructions,
  customAttributes,
  transform
) {
  // Calculate total required buffer size
  let totalVertices = 0;
  let totalRings = 0;
  let totalPolygons = 0;

  for (const feature of features) {
    const geom = feature.getGeometry();
    if (!geom) continue;

    if (geom instanceof Polygon) {
      totalVertices += geom.getFlatCoordinates().length;
      totalRings += geom.getEnds().length;
      totalPolygons++;
    }
    else if (geom instanceof MultiPolygon) {
      const polygons = geom.getCoordinates();
      totalPolygons += polygons.length;
      
      for (const polygon of polygons) {
        totalRings += polygon.length;
        totalVertices += polygon.flat().length;
      }
    }
  }

  const attrSize = getCustomAttributesSize(customAttributes);
  const totalSize = totalPolygons * (1 + attrSize) + totalRings + totalVertices * 2;
  
  if (!renderInstructions || renderInstructions.length !== totalSize) {
    renderInstructions = new Float32Array(totalSize);
  }

  let idx = 0;
  
  for (const feature of features) {
    const geom = feature.getGeometry();
    if (!geom) continue;

    const processPolygon = (flatCoords, ends) => {
      // Push attributes
      idx += pushCustomAttributesInRenderInstructions(
        renderInstructions, customAttributes, feature, idx
      );
      
      // Push ring count
      renderInstructions[idx++] = ends.length;
      
      // Push vertices per ring
      let offset = 0;
      for (const end of ends) {
        const count = (end - offset) / geom.getStride();
        renderInstructions[idx++] = count;
        offset = end;
      }
      
      // Transform and push coordinates
      transform2D(
        flatCoords,
        0,
        flatCoords.length,
        geom.getStride(),
        transform,
        renderInstructions,
        idx
      );
      idx += flatCoords.length;
    };

    if (geom instanceof Polygon) {
      processPolygon(geom.getFlatCoordinates(), geom.getEnds());
    }
    else if (geom instanceof MultiPolygon) {
      const polygons = geom.getCoordinates();
      for (const polygon of polygons) {
        const flat = polygon.flat();
        const ends = [];
        let offset = 0;
        
        for (const ring of polygon) {
          offset += ring.length;
          ends.push(offset);
        }
        
        processPolygon(flat, ends);
      }
    }
  }
  
  return renderInstructions;
}

/**
 * Calculate total size of custom attributes
 * @param {import('./VectorStyleRenderer.js').AttributeDefinitions} customAttributes
 * @return {number}
 */
export function getCustomAttributesSize(customAttributes) {
  return Object.values(customAttributes).reduce(
    (sum, attr) => sum + (attr.size || 1),
    0
  );
}
