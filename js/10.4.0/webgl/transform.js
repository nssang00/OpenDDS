

renderInstructions.js
    generateLineStringRenderInstructions

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


bufferUtil.js
writeLineSegmentToBuffers

const invertTransform = createTransform();
makeInverseTransform(invertTransform, transform);

        // to compute join angles we need to reproject coordinates back in world units
const p0world = applyTransform(toWorldTransform, [...p0]);
const p1world = applyTransform(toWorldTransform, [...p1]);
