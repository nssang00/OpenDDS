const worker = new Worker('webglWorker.js');

worker.onmessage = (event) => {
  const { vertexBuffer, indexBuffer } = event.data;
  console.log('Buffers received:', {
    vertices: new Float32Array(vertexBuffer),
    indices: new Uint32Array(indexBuffer)
  });
};
