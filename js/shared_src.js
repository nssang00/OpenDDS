buildLayer(layerObj) {
    const scaleMap = {
        "25K"  :   25000,
        "50K"  :   50000,
        "100K" :  100000,
        "250K" :  250000,
        "500K" :  500000,
        "1M"   : 1000000
    };

    const scaleToResolution = (scale) => scale / (this.dpi * (1000 / 25.4));
    const resolutions = layerObj.Map.split(',').map(v => scaleToResolution(scaleMap[v.trim()]));

    const baseFilters = [
        'all',
        ['<=', ['resolution'], Math.max(...resolutions)],
        ['>', ['resolution'], Math.min(...resolutions)],
        ...(this.sharedSource ? [['==', ['get', 'layer'], layerObj.SHPSource]] : []),
        //...(layerObj.GeometryType ? [['==', ['geometry-type'], layerObj.GeometryType]] : [])
    ];

    const layerSource = this.sharedSource || layerObj.SHPSource;

    return {
        name: layerObj.Name,
        source: layerSource, 
        rules: layerObj.features.map(featureObj => {
            const { name, styleNames, filters } = this.buildFeature(featureObj);
            return {
                name,
                styleNames,
                filter: [...baseFilters, ...filters] // 최종 필터 병합
            };
        })
    };
}
