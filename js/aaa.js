function createStyledLayers_(layerOptions) {
    return layerOptions.map(({ name, style, source }) => {
        if (typeof style === 'function') {
            return new VectorTileLayer({
                name: name,
                source: source,
                style: style
            });
        } else {
            return new WebGLVectorTileLayer({
                name: name,
                source: source,
                style: style
            });
            /*
            return new (class extends VectorTileLayer {
                createRenderer() {
                    return new WebGLVectorTileLayerRenderer(this, {
                        style: style
                    });
                }
            })({
                source: source
            });
            */
        }
    });
  }


function buildStyledOlLayers_(styleObj, layersObj, urlTemplate) {
    return layersObj.map(layerObj => {//Layer
      if (layerObj.layers) {
        return new LayerGroup({
            name: layerObj.name,
          layers: buildStyledOlLayers_(styleObj, layerObj.layers, urlTemplate)
        });
      }
  
      const layerSource = getOrCreateLayerSource(layerObj.source, urlTemplate); // 소스 생성 또는 캐싱된 소스 가져오기
  
      const layerOptions = []; // name, style, source를 포함하는 데이터 구조
  
      for (const rule of layerObj.rules) {//Feature마다 레이어 생성
        const filteredStyles = [];
        for (const styleName of rule.styleNames) {
            if (!styleObj[styleName]) {
                throw new Error(`Style '${styleName}' not found in styleObj`);
            }
            
            const styles = [].concat(styleObj[styleName]); // 항상 배열로 변환
            for (const style of styles) {
                filteredStyles.push({...style, filter: rule.filter});
            }
        }
        layerOptions.push({
              name: rule.name, // 개별 rule의 이름
              style: processRulesToOlStyles_(filteredStyles),
              source: layerSource // 소스 포함
        });
      }
  
      // layerOptions를 createStyledLayers로 전달
      const styledLayers = createStyledLayers_(layerOptions);
  
      return styledLayers.length === 1
        ? styledLayers[0]
        : new LayerGroup({ name: layerObj.name, layers: styledLayers });
    });
}
