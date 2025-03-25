{
  "scripts": {
    "build:worker": "webpack --config webpack.worker.config.js",
    "build:main": "webpack --config webpack.main.config.js",
    "build": "npm run build:worker && npm run build:main"
  }
}
