function generatePolygonBuffers(instructions, customAttrsCount) {
  const verticesCap = instructions.length;          // 대충 넉넉히
  const verts = new Float32Array(verticesCap);
  const idxs  = new Uint32Array(verticesCap * 1.5); // rough upper bound

  let instr = 0, vPtr = 0, iPtr = 0, polyVertexBase = 0;
  const holes = [];

  while (instr < instructions.length) {
    const attrs = instructions.subarray(instr, instr += customAttrsCount);

    const rings = instructions[instr++];
    holes.length = rings - 1;      // reuse array
    let polyVertCount = 0;

    for (let r = 0; r < rings; ++r) {
      polyVertCount += instructions[instr++];
      if (r < rings - 1) holes[r] = polyVertCount;
    }

    const flat = instructions.subarray(instr, instr += polyVertCount * 2);

    for (let v = 0; v < polyVertCount; ++v, ++vPtr) {
      const base = vPtr * (2 + customAttrsCount);
      verts[base] = flat[v*2];
      verts[base+1] = flat[v*2+1];
      for (let a = 0; a < customAttrsCount; ++a) verts[base+2+a] = attrs[a];
    }

    const res = earcut(flat, holes, 2);
    for (let j = 0; j < res.length; ++j) idxs[iPtr++] = res[j] + polyVertexBase;

    polyVertexBase += polyVertCount;
  }

  return {
    vertexAttributesBuffer: verts.subarray(0, vPtr * (2 + customAttrsCount)),
    indicesBuffer: idxs.subarray(0, iPtr),
    instanceAttributesBuffer: new Float32Array(0),
  };
}
