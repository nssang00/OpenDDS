import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import {Tile as TileLayer, VectorTile as VectorTileLayer} from 'ol/layer';
import {OSM, VectorTile as VectorTileSource} from 'ol/source';
import MVT from 'ol/format/MVT';
import {Fill, Stroke, Style} from 'ol/style';
import {WebGLVectorTileLayerRenderer} from 'ol/renderer/webgl/VectorTileLayer';

function createVectorTileLayer(useWebGL, vectorSourceUrl, style) {
  const vectorTileSource = new VectorTileSource({
    format: new MVT(),
    url: vectorSourceUrl
  });

  if (useWebGL) {
    return new (class extends VectorTileLayer {
      createRenderer() {
        return new WebGLVectorTileLayerRenderer(this, {
          style: styles
        });
      }
    })({
      source: vectorTileSource,
    });
  }  else {
    return new VectorTileLayer({
      source: vectorTileSource,
      style: styles
    });
  }
}


const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    }),
    createVectorTileLayer(true, 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.pbf', webGLStyle),
    createVectorTileLayer(false, 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.pbf', canvasStyle)
  ],
  view: new View({
    center: [0, 0],
    zoom: 2
  })
});

function createVectorTileLayers(vtSourceUrl, stylesArray) {
  const vectorTileSource = new VectorTileSource({
    format: new MVT(),
    url: vtSourceUrl
  });

  return stylesArray.map((style) => {
    if (typeof style === 'function') {
      // 스타일이 함수일 경우 Canvas 방식으로 레이어 생성
      return new VectorTileLayer({
        source: vectorTileSource,
        style: style, 
      });
    } else {
      // 스타일이 함수가 아닐 경우 WebGL 방식으로 레이어 생성
      return new (class extends VectorTileLayer {
        createRenderer() {
          return new WebGLVectorTileLayerRenderer(this, {
            style: style // 객체형 스타일
          });
        }
      })({
        source: vectorTileSource,
      });
    }
  });
}
