['==', ['get', 'layer'], 'transportation'],
['==', ['geometry-type'], 'Polygon'],
      

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

    // baseFilters 생성 시 공용 소스 여부 체크
    const baseFilters = [
        'all',
        ['<=', ['resolution'], Math.max(...resolutions)],
        ['>', ['resolution'], Math.min(...resolutions)],
        ...(this.sharedSource ? [['==', ['get', 'layer'], layerObj.SHPSource]] : []) // 공용 소스 필터 조건
    ];

    const layerSource = this.sharedSource || layerObj.SHPSource; // 공용 소스 또는 개별 소스

    return {
        name: layerObj.Name,
        source: layerSource, // source 키에 layerSource 값 할당
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
