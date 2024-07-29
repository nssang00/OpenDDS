import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import {Tile as TileLayer, VectorTile as VectorTileLayer} from 'ol/layer';
import {OSM, VectorTile as VectorTileSource} from 'ol/source';
import MVT from 'ol/format/MVT';
import {Fill, Stroke, Style} from 'ol/style';
import {WebGLVectorTileLayerRenderer} from 'ol/renderer/webgl/VectorTileLayer';




function createStyledLayers(vtSourceUrl, stylesArray) {
  const vectorTileSource = new VectorTileSource({
    format: new MVT(),
    url: vtSourceUrl
  });

  return stylesArray.map((style) => {
    if (typeof style === 'function') {
      // If the style is a function, create a Canvas-based VectorTileLayer
      return new VectorTileLayer({
        source: vectorTileSource,
        style: style, 
      });
    } else {//useWebGL
      // If the style is not a function, create a WebGL-based VectorTileLayer
      return new (class extends VectorTileLayer {
        createRenderer() {
          return new WebGLVectorTileLayerRenderer(this, {
            style: style // flat styles
          });
        }
      })({
        source: vectorTileSource,
      });
    }
  });
}

const vtSourceUrl = 'https://your-vector-tile-source-url/{z}/{x}/{y}.pbf'; // 벡터 타일 소스 URL
const styles = [
  function(feature, resolution) {
    return new ol.style.Style({
      fill: new ol.style.Fill({
          color: 'rgba(255, 255, 255, 0.6)'
      }),
      stroke: new ol.style.Stroke({
          color: '#319FD3',
          width: 1
      })
    });
  },
  {
    fill: new ol.style.Fill({
        color: 'rgba(255, 0, 0, 0.6)'
    }),
    stroke: new ol.style.Stroke({
        color: '#000',
        width: 1
    })
  }
];

const vectorLayers = createStyledLayers(vtSourceUrl, styles);
for (const layer of vectorLayers) {
    map.addLayer(layer);
}

