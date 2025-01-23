buildLineStyle(lineStyleObj) {
    if (!lineStyleObj.symbolizers) {
        return { style: {} }; // Return an empty style object if symbolizers is not present
    }
    return lineStyleObj.symbolizers.map(symbolizer => this.buildLineSymbolizer(symbolizer));
}


buildPointStyle(pointStyleObj) {
    if (!pointStyleObj.symbolizers) {
        return { style: {} }; // Return an empty style object if symbolizers is not present
    }

    const offset = [Number(pointStyleObj.OffsetX), Number(pointStyleObj.OffsetY)];
    for (const symbolizer of pointStyleObj.symbolizers) {
        switch (symbolizer.type) {
            case "SIMPLE":
                if (symbolizer.Shape === "0") { // Circle
                    return {
                        style: {
                            'circle-radius': symbolizer.Size,
                            'circle-fill-color': this.toRGBAArray(symbolizer.Color),
                            'circle-displacement': offset,
                        }
                    };
                } else if (symbolizer.Shape === "1") { // Rectangle
                    return {
                        style: {
                            'shape-points': 4,
                            'shape-radius': symbolizer.Size,
                            'shape-fill-color': this.toRGBAArray(symbolizer.Color),
                            'shape-displacement': offset,
                            'shape-angle': Math.PI / 4,
                        }
                    };
                }
                break;
            case "PICTURE":
                return {
                    style: {
                        'icon-src': `${this.baseSymbolPath}${symbolizer.Picture}`,
                        'icon-displacement': offset,
                    }
                };
                break;    
            default:
                break;
        }
    }
}
