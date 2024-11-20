function findLayerByName(layers, layerName) {
  for (const layer of layers) {
    if (layer.get('name') === layerName) {
      return layer;
    }

    // If the layer is a LayerGroup, search recursively
    if (layer instanceof LayerGroup) {
      const result = findLayerByName(layer.getLayers().getArray(), layerName);
      if (result) {
        return result;
      }
    }
  }
  return null;
}

function setLayerVisibility(map, layerName, visible) {
  const layers = map.getLayers().getArray();
  const layer = findLayerByName(layers, layerName);

  if (layer) {
    layer.setVisible(visible);
  } else {
    console.error(`Layer with name "${layerName}" not found`);
  }
}

// Example usage
setLayerVisibility(map, '2차선 도로', true);


///////
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
