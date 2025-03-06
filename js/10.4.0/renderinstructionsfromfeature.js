function pushCustomAttributesInRenderInstructionsFromFeature(
  renderInstructions,
  customAttributes,
  feature,
  currentIndex,
) {
  let shift = 0;
  for (const key in customAttributes) {
    const attr = customAttributes[key];
    const value = attr.callback(feature);
    const size = attr.size ?? 1;

    for (let i = 0; i < size; i++) {
      renderInstructions[currentIndex + shift++] = value[i] ?? value;
    }
  }
  return shift;
}
//////////

// ... existing code ...

import {transform2D} from '../../geom/flat/transform.js';
import {apply as applyTransform} from '../../transform.js';

/**
 * @param {Float32Array} renderInstructions Render instructions
 * @param {import('./VectorStyleRenderer.js').AttributeDefinitions} customAttributes Custom attributes
 * @param {import("../../Feature.js").default} feature Feature
 * @param {number} currentIndex Current index
 * @return {number} The amount of values pushed
 */
function pushCustomAttributesInRenderInstructionsFromFeature(
  renderInstructions,
  customAttributes,
  feature,
  currentIndex,
) {
  let shift = 0;
  for (const key in customAttributes) {
    const attr = customAttributes[key];
    const value = attr.callback(feature);
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
 * @param {Array<import("../../Feature.js").default>} features Array of features
 * @param {Float32Array} renderInstructions Render instructions
 * @param {import('./VectorStyleRenderer.js').AttributeDefinitions} customAttributes Custom attributes
 * @param {import("../../transform.js").Transform} transform Transform to apply to coordinates
 * @return {Float32Array} Generated render instructions
 */
export function generateLineStringRenderInstructionsFromFeature(
  features,
  renderInstructions,
  customAttributes,
  transform,
) {
  const totalInstructionsCount = features.reduce((count, feature) => {
    const geometry = feature.getGeometry();
    if (!geometry) return count;
    const flatCoords = geometry.getFlatCoordinates();
    const verticesCount = flatCoords.length / 3; // assuming 3D coordinates
    return count + verticesCount * 3 + getCustomAttributesSize(customAttributes);
  }, 0);

  if (!renderInstructions || renderInstructions.length !== totalInstructionsCount) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }

  let renderIndex = 0;
  for (const feature of features) {
    const geometry = feature.getGeometry();
    if (!geometry) continue;

    const flatCoords = geometry.getFlatCoordinates();
    const transformedCoords = new Array(flatCoords.length);
    transform2D(flatCoords, 0, flatCoords.length, 3, transform, transformedCoords, 3);

    for (let i = 0; i < transformedCoords.length; i += 3) {
      renderInstructions[renderIndex++] = transformedCoords[i];
      renderInstructions[renderIndex++] = transformedCoords[i + 1];
      renderInstructions[renderIndex++] = transformedCoords[i + 2];
      renderIndex += pushCustomAttributesInRenderInstructionsFromFeature(
        renderInstructions,
        customAttributes,
        feature,
        renderIndex,
      );
    }
  }
  return renderInstructions;
}

/**
 * @param {Array<import("../../Feature.js").default>} features Array of features
 * @param {Float32Array} renderInstructions Render instructions
 * @param {import('./VectorStyleRenderer.js').AttributeDefinitions} customAttributes Custom attributes
 * @param {import("../../transform.js").Transform} transform Transform to apply to coordinates
 * @return {Float32Array} Generated render instructions
 */
export function generatePolygonRenderInstructionsFromFeature(
  features,
  renderInstructions,
  customAttributes,
  transform,
) {
  const totalInstructionsCount = features.reduce((count, feature) => {
    const geometry = feature.getGeometry();
    if (!geometry) return count;
    const flatCoords = geometry.getFlatCoordinates();
    const verticesCount = flatCoords.length / 2; // assuming 2D coordinates
    return count + verticesCount * 2 + getCustomAttributesSize(customAttributes);
  }, 0);

  if (!renderInstructions || renderInstructions.length !== totalInstructionsCount) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }

  let renderIndex = 0;
  for (const feature of features) {
    const geometry = feature.getGeometry();
    if (!geometry) continue;

    const flatCoords = geometry.getFlatCoordinates();
    const transformedCoords = new Array(flatCoords.length);
    transform2D(flatCoords, 0, flatCoords.length, 2, transform, transformedCoords, 2);

    for (let i = 0; i < transformedCoords.length; i += 2) {
      renderInstructions[renderIndex++] = transformedCoords[i];
      renderInstructions[renderIndex++] = transformedCoords[i + 1];
      renderIndex += pushCustomAttributesInRenderInstructionsFromFeature(
        renderInstructions,
        customAttributes,
        feature,
        renderIndex,
      );
    }
  }
  return renderInstructions;
}

/**
 * @param {Array<import("../../Feature.js").default>} features Array of features
 * @param {Float32Array} renderInstructions Render instructions
 * @param {import('./VectorStyleRenderer.js').AttributeDefinitions} customAttributes Custom attributes
 * @param {import("../../transform.js").Transform} transform Transform to apply to coordinates
 * @return {Float32Array} Generated render instructions
 */
export function generatePointRenderInstructionsFromFeature(
  features,
  renderInstructions,
  customAttributes,
  transform,
) {
  const totalInstructionsCount = features.reduce((count, feature) => {
    const geometry = feature.getGeometry();
    if (!geometry) return count;
    return count + 2 + getCustomAttributesSize(customAttributes); // 2 for x and y
  }, 0);

  if (!renderInstructions || renderInstructions.length !== totalInstructionsCount) {
    renderInstructions = new Float32Array(totalInstructionsCount);
  }

  let renderIndex = 0;
  for (const feature of features) {
    const geometry = feature.getGeometry();
    if (!geometry) continue;

    const flatCoords = geometry.getFlatCoordinates();
    const transformedCoords = new Array(2);
    transform2D(flatCoords, 0, 2, 2, transform, transformedCoords, 2);

    renderInstructions[renderIndex++] = transformedCoords[0];
    renderInstructions[renderIndex++] = transformedCoords[1];
    renderIndex += pushCustomAttributesInRenderInstructionsFromFeature(
      renderInstructions,
      customAttributes,
      feature,
      renderIndex,
    );
  }
  return renderInstructions;
}

// ... existing code ...
