let olSymbolizer = {
    symbol: {
        'type': 'picture',
        'picture-texture-line': symbolizer.TextureLine === "true"
    },
    style: {
        'stroke-pattern-src': `${this.baseSymbolPath}${symbolizer.Picture}`,
        ...(symbolizer.Width && { 'stroke-width': Number(symbolizer.Width) })
    }
};
