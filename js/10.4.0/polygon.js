const polygon1 = {
  //filter: ['==', ['get', 'layer'], 'waterway'],
  filter: [
    'all',
    ['<', ['resolution'], 600],    
    ['in', ['get', 'class'], ['literal', ['naturpark', 'nature_reserve']]],
    ['==', ['get', 'layer'], 'park'],
    //['==', ['geometry-type'], 'Polygon'],
  ],      
  style: {
    'fill-color': 'blue',
    'stroke-color': 'green',
    'stroke-width': 2,    
  },
}

const polygon2 = {
  //filter: ['==', ['get', 'layer'], 'waterway'],
  filter: [
    'all',
    ['<', ['resolution'], 600],    
    ['in', ['get', 'class'], ['literal', ['lake', 'ocean']]],
    ['==', ['get', 'layer'], 'water'],
    //['==', ['geometry-type'], 'Polygon'],
  ],      
  style: {
    'fill-color': 'blue',
    'stroke-color': 'yellow',
    'stroke-width': 2,    
  },
}
