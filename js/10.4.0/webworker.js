const worker = new Worker('webglWorker.js');

///////////////////////////
const path = require('path');

module.exports = {
  entry: './src/worker/webgl.worker.js',
  output: {
    filename: 'webgl.worker.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: {
          loader: 'worker-loader',
          options: {
            inline: 'fallback',
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
  },
  mode: 'development',
};


////////////////////////
const path = require('path');

module.exports = {
  entry: './src/main.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.worker\.js$/, // .worker.js 파일에 적용
        use: {
          loader: 'worker-loader',
          options: {
            inline: 'fallback', // 인라인 처리 + 폴백 제공
          },
        },
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
  },
  mode: 'development',
};







//////////////////////




export function create() {
  const workerScript = `
    importScripts('./constants.js', './utils.js', '../transform.js');

    const worker = self;

    worker.onmessage = (event) => {
      const received = event.data;
      switch (received.type) {
        case WebGLWorkerMessageType.GENERATE_POINT_BUFFERS: {
          const baseVertexAttrsCount = 3;
          const baseInstructionsCount = 2;

          const customAttrsCount = received.customAttributesSize;
          const instructionsCount = baseInstructionsCount + customAttrsCount;
          const renderInstructions = new Float32Array(received.renderInstructions);

          const elementsCount = renderInstructions.length / instructionsCount;
          const indicesCount = elementsCount * 6;
          const verticesCount =
            elementsCount * 4 * (customAttrsCount + baseVertexAttrsCount);
          const indexBuffer = new Uint32Array(indicesCount);
          const vertexBuffer = new Float32Array(verticesCount);

          let bufferPositions;
          for (let i = 0; i < renderInstructions.length; i += instructionsCount) {
            bufferPositions = writePointFeatureToBuffers(
              renderInstructions,
              i,
              vertexBuffer,
              indexBuffer,
              customAttrsCount,
              bufferPositions
            );
          }

          const message = Object.assign(
            {
              vertexBuffer: vertexBuffer.buffer,
              indexBuffer: indexBuffer.buffer,
              renderInstructions: renderInstructions.buffer,
            },
            received
          );

          worker.postMessage(message, [
            vertexBuffer.buffer,
            indexBuffer.buffer,
            renderInstructions.buffer,
          ]);
          break;
        }
        default:
          // pass
      }
    };
  `;

  const blob = new Blob([workerScript], { type: "application/javascript" });
  const worker = new Worker(URL.createObjectURL(blob));

  return worker;
}

// 사용 예시
const myWorker = create();
myWorker.postMessage({ type: 'GENERATE_POINT_BUFFERS', customAttributesSize: 2, renderInstructions: new Float32Array([1, 2, 3]) });

myWorker.onmessage = (event) => {
  console.log("Worker response:", event.data);
};
