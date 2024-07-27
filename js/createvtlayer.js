import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import {Tile as TileLayer, VectorTile as VectorTileLayer} from 'ol/layer';
import {OSM, VectorTile as VectorTileSource} from 'ol/source';
import MVT from 'ol/format/MVT';
import {WebGLVectorLayerRenderer} from 'ol/renderer/webgl/VectorLayer';

function createVectorTileLayer(useWebGL, vectorSourceUrl, style) {
  const vectorTileSource = new VectorTileSource({
    format: new MVT(),
    url: vectorSourceUrl
  });

  const vectorTileLayer = new VectorTileLayer({
    source: vectorTileSource,
    style: style,
    renderMode: useWebGL ? 'vector' : 'image'
  });

  if (useWebGL) {
    vectorTileLayer.setRenderer(new WebGLVectorLayerRenderer(vectorTileLayer));
  }

  return vectorTileLayer;
}

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    }),
    createVectorTileLayer(true, 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.pbf', new Style({
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.6)'
      }),
      stroke: new Stroke({
        color: '#319FD3',
        width: 1
      })
    }))
  ],
  view: new View({
    center: [0, 0],
    zoom: 2
  })
});
