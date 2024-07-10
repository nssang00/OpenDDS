const result = parseLiteralStyle({
  /*
  filter: [
    'all',
    ['==', ['get', 'layer'], 'transportation'],
    ['==', ['get', 'fillColor'], 'Polygon'],
    //['==', ['geometry-type'], 'Polygon'],
  ],*/
  filter: ['==', ['get', 'layer'], 'water'],
  //'icon-src': './data/fish.png',
  'stroke-pattern-src': './data/fish.png',
  //'stroke-pattern-src': './data/fish.png',
  //'stroke-pattern-spacing': 30,
  //'stroke-color': 'red',  
  //'stroke-width': 1,
  //'stroke-offset': -32,
});

const withTint_SHADERS = {
  builder: result.builder,
  attributes: {
    fillColor: {
      size: 2,
      callback: (feature) => {
        const geometryType = feature.getGeometry().getType();
        //const style = this.getStyle()(feature, 1)[0];
        //const color = asArray(style?.getFill()?.getColor() || '#eee');
        if(geometryType === 'LineString')
        {
        //console.log(geometryType)
        }
        return geometryType;
        //return packColor(color);
      },
    },
  },
};
