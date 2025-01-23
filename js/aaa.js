buildLineStyle(lineStyleObj) {
    if (!lineStyleObj.symbolizers) {
        return { style: {} }; // Return an empty style object if symbolizers is not present
    }
    return lineStyleObj.symbolizers.map(symbolizer => this.buildLineSymbolizer(symbolizer));
}
