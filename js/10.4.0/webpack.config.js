const webpack = require('webpack');

module.exports = {
  mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
  entry: './main.js',
  devtool: 'eval-source-map',  
  output: {
    path: __dirname,
    filename: 'bundle.js'
  },
};
