function toOlMapLayer(layersObj) {
  const olLayers = {};

  for (const layerObj of layersObj) {
    olLayers[layerObj.Name] = convertLayer(layerObj);
  }

  return olLayers;

  function convertLayer(layerObj) {
    if (layerObj.type === "Group") {
      return toOlGroup(layerObj);
    }
    // "Layer"인 경우
    return toOlLayer(layerObj);
  }

  function toOlGroup(groupObj) {
    const olLayers = {};
    for (const layerObj of groupObj.layers) {
      olLayers[layerObj.Name] = convertLayer(layerObj); // convertLayer를 호출하여 레이어 처리
    }
    return olLayers;
  }

  function toOlLayer(layerObj) {
    // 여기에 olLayer 변환 로직을 추가합니다.
    return {
      name: layerObj.Name,
      // 추가적인 속성 변환 로직
    };
  }
}
