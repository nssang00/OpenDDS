// webpack.worker.config.js
const path = require('path');

class BlobWrapperPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('BlobWrapperPlugin', (compilation) => {
      const workerContent = require('fs').readFileSync(
        path.resolve(__dirname, 'worker.bundle.js'),
        'utf8'
      );
      const blobWrappedContent = `
        export function create() {
          const source = ${JSON.stringify(workerContent)};
          return new Worker(typeof Blob === 'undefined'
            ? 'data:application/javascript;base64,' + btoa(source)
            : URL.createObjectURL(new Blob([source], {type: 'application/javascript'})));
        }
      `;
      require('fs').writeFileSync(
        path.resolve(__dirname, './node_modules/ol/worker/webgl.js'),
        blobWrappedContent
      );
      console.log('worker-blob.js generated successfully!');
    });
  }
}

module.exports = {
  mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
  //target: 'webworker',
  entry: './worker.webgl.js',
  //devtool: 'source-map',
  output: {
    path: __dirname,
    filename: './worker.bundle.js'//'worker.bundle.js',
  },
  plugins: [new BlobWrapperPlugin()]
};