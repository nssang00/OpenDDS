function buildStyledOlLayers(styleObj, layersObj, urlTemplate) {
    return layersObj.map(layerObj => {
        const styledLayers = [];
      
        if (layerObj.layers) {
          styledLayers = buildStyledOlLayers(styleObj, layerObj.layers, urlTemplate);
        }
        else {
          const layerSource = getOrCreateLayerSource(layerObj.source, urlTemplate);
  
          for (const rule of layerObj.rules) {
              const filteredStyles = [];
              for (const styleName of rule.styleNames) {
                  if (!styleObj[styleName]) {
                      throw new Error(`Style '${styleName}' not found in styleObj`);
                  }
  
                  const styles = [].concat(styleObj[styleName]);
                  for (const style of styles) {
                      filteredStyles.push({...style, filter: rule.filter});
                  }
              }
              styledLayers.push(createStyledLayers({
                  name: rule.name,
                  styles: processRulesToOlStyles(filteredStyles),  
                  source: layerSource,
              }));
          }
        }

        return new LayerGroup({
            name: layerObj.name, 
            layers: styledLayers
        });
    });
}
