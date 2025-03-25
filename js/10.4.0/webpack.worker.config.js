const webpack = require('webpack');

module.exports = {
  mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
  entry: './node_modules/ol/worker/webgl.worker.js',
  //devtool: 'eval-source-map',  
  output: {
    path: __dirname,
    filename: 'webgl.worker.js'
  },
};
