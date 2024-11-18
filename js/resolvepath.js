
const raster = new TileLayer({
  name: '2차선 도로',
  source: new OSM(),
});

function setLayerVisibility(map, layerName, visible) {
  const layer = map.getLayers().getArray().find(layer => layer.get('name') === layerName);
  
  if (layer) {
    layer.setVisible(visible);
  } else {
    console.error(`Layer with name "${layerName}" not found`);
  }
}

setLayerVisibility(map, '2차선 도로', true);
