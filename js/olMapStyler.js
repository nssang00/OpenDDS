import { MapStyler } from './mapLayerBuilder.js';

// OlMapStyler 정의
class OlMapStyler extends MapStyler {
  applyMap(map, { styles, layers }) {
    console.log("Applying OpenLayers styles and layers", styles, layers);
    // OpenLayers 스타일과 레이어를 맵에 적용하는 로직 구현
  }
}

export default OlMapStyler;
