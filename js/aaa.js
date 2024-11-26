function buildStyledOlLayers(styleObj, layersObj, urlTemplate) {
  return layersObj.map(layerObj => {
    if (layerObj.layers) {
      return new LayerGroup({
        layers: buildStyledOlLayers(styleObj, layerObj.layers, urlTemplate)
      });
    }

    const sourceId = layerObj.SHPSource; // SHPSource -> sourceId로 변경

    // Retrieve or create the layerSource with caching
    const layerSource = getOrCreateLayerSource(sourceId, urlTemplate);

    const filteredStyles = []; // 모든 스타일을 모을 배열

    for (const rule of layerObj.rules) {
      for (const styleName of rule.styleNames) {
        const styles = [].concat(styleObj[styleName]);
        for (const style of styles) {
          filteredStyles.push({
            name: rule.name, // 추가된 name 필드
            style: { 
              ...style, 
              filter: rule.filter 
            }
          });
        }
      }
    }

    // styles와 names로 구분하여 createStyledLayers 호출
    const styledLayers = createStyledLayers({
      styles: filteredStyles.map(entry => entry.style),
      names: filteredStyles.map(entry => entry.name),
      source: layerSource
    });

    return styledLayers.length === 1
      ? styledLayers[0]
      : new LayerGroup({ layers: styledLayers });
  });
}
