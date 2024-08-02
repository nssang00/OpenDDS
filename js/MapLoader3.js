  applyMap() {
    if (!this.parsedStyles || !this.parsedLayers) {
      throw new Error("Map data has not been loaded. Call loadMap first.");
    }
    this.olStyles = this.processStyles(this.parsedStyles);
    this.olLayers = this.processLayers(this.parsedLayers);
    // Here you would apply the styles and layers to your OpenLayers map
  }

  processStyles(parsedStyles) {
    return this.toOlMapStyle(parsedStyles);
  }

  processLayers(parsedLayers) {
    return this.toOlMapLayer(parsedLayers);
  }
