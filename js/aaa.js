function buildStyledOlLayers_(styleObj, layersObj, urlTemplate) {
    return layersObj.map(layerObj => {
        let styledLayers = [];

        // 레이어가 하위 레이어를 포함하고 있으면 재귀적으로 처리
        if (layerObj.layers) {
            styledLayers = buildStyledOlLayers_(styleObj, layerObj.layers, urlTemplate);
        } else {
            // 레이어 소스 생성 또는 캐싱된 소스 가져오기
            const layerSource = getOrCreateLayerSource(layerObj.source, urlTemplate);

            for (const rule of layerObj.rules) {
                const filteredStyles = [];

                // 각 규칙에 맞는 스타일을 필터링
                for (const styleName of rule.styleNames) {
                    if (!styleObj[styleName]) {
                        throw new Error(`Style '${styleName}' not found in styleObj`);
                    }

                    const styles = [].concat(styleObj[styleName]);  // 스타일을 배열로 변환
                    for (const style of styles) {
                        filteredStyles.push({ ...style, filter: rule.filter });
                    }
                }

                // 각 규칙에 대해 스타일을 기반으로 레이어 생성
                const layersForRule = createStyledLayers_(filteredStyles, rule.name, layerSource);

                // 생성된 레이어가 LayerGroup이라면 그 안의 레이어를 모두 추가
                if (layersForRule instanceof LayerGroup) {
                    styledLayers.push(...layersForRule.getLayers().getArray());
                } else {
                    // 단일 레이어라면 그 자체를 추가
                    styledLayers.push(layersForRule);
                }
            }
        }

        // 최종적으로 LayerGroup 생성
        return new LayerGroup({
            name: layerObj.name,  // LayerGroup에 이름 지정
            layers: styledLayers
        });
    });
}
