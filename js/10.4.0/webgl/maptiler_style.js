const style5 = [
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'landuse'],
      ['==', ['get', 'class'], 'park'],
    ],
    style: {
      'fill-color': '#d8e8c8',
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'landuse'],
      ['==', ['get', 'type'], 'cemetery'],
    ],
    style: {
      'fill-color': '#e0e4dd',
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'landuse'],
      ['==', ['get', 'type'], 'hospital'],
    ],
    style: {
      'fill-color': '#fde',
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'landuse'],
      ['==', ['get', 'class'], 'school'],
    ],
    style: {
      'fill-color': '#f0e8f8',
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'landuse'],
      ['==', ['get', 'class'], 'wood'],
    ],
    style: {
      'fill-color': 'rgb(233,238,223)',
    },
  },
  {
    filter: ['==', ['source-layer'], 'waterway'],
    style: {
      'stroke-color': '#a0c8f0',
      'stroke-width': 1,
    },
  },
  {
    filter: ['==', ['source-layer'], 'water'],
    style: {
      'fill-color': '#a0c8f0',
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'aeroway'],
      ['==', ['geometry-type'], 'Polygon'],
    ],
    style: {
      'fill-color': 'rgb(242,239,235)',
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'aeroway'],
      ['==', ['geometry-type'], 'LineString'],
      ['<=', ['zoom'], 14], // 해상도 → 줌
    ],
    style: {
      'fill-color': '#f0ede9',
    },
  },
  {
    filter: ['==', ['source-layer'], 'building'],
    style: {
      'fill-color': '#f2eae2',
      'stroke-color': '#dfdbd7',
      'stroke-width': 1,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'tunnel'],
      ['==', ['get', 'class'], 'motorway_link'],
    ],
    style: {
      'stroke-color': '#e9ac77',
      'stroke-width': 1,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'tunnel'],
      ['==', ['get', 'class'], 'service'],
    ],
    style: {
      'stroke-color': '#cfcdca',
      'stroke-width': 1,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'tunnel'],
      [
        'any',
        ['==', ['get', 'class'], 'street'],
        ['==', ['get', 'class'], 'street_limited'],
      ],
    ],
    style: {
      'stroke-color': '#cfcdca',
      'stroke-width': 1,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'tunnel'],
      ['==', ['get', 'class'], 'main'],
      ['<=', ['zoom'], 11],
    ],
    style: {
      'stroke-color': '#e9ac77',
      'stroke-width': 1,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'tunnel'],
      ['==', ['get', 'class'], 'motorway'],
    ],
    style: {
      'stroke-color': '#e9ac77',
      'stroke-width': 1,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'tunnel'],
      ['==', ['get', 'class'], 'path'],
    ],
    style: {
      'stroke-color': '#cba',
      'stroke-width': 1,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'tunnel'],
      ['==', ['get', 'class'], 'major_rail'],
    ],
    style: {
      'stroke-color': '#bbb',
      'stroke-width': 2,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'road'],
      ['==', ['get', 'class'], 'motorway_link'],
    ],
    style: {
      'stroke-color': '#e9ac77',
      'stroke-width': 1,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'road'],
      [
        'any',
        ['==', ['get', 'class'], 'street'],
        ['==', ['get', 'class'], 'street_limited'],
      ],
      ['==', ['geometry-type'], 'LineString'],
    ],
    style: {
      'stroke-color': '#cfcdca',
      'stroke-width': 1,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'road'],
      ['==', ['get', 'class'], 'main'],
      ['<=', ['zoom'], 11],
    ],
    style: {
      'stroke-color': '#e9ac77',
      'stroke-width': 1,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'road'],
      ['==', ['get', 'class'], 'motorway'],
      ['<=', ['zoom'], 8],
    ],
    style: {
      'stroke-color': '#e9ac77',
      'stroke-width': 1,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'road'],
      ['==', ['get', 'class'], 'path'],
    ],
    style: {
      'stroke-color': '#cba',
      'stroke-width': 1,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'road'],
      ['==', ['get', 'class'], 'major_rail'],
    ],
    style: {
      'stroke-color': '#bbb',
      'stroke-width': 2,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'bridge'],
      [
        'any',
        ['==', ['get', 'class'], 'motorway'],
        ['==', ['get', 'class'], 'motorway_link'],
      ],
    ],
    style: {
      'stroke-color': '#e9ac77',
      'stroke-width': 1,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'bridge'],
      [
        'any',
        ['==', ['get', 'class'], 'street'],
        ['==', ['get', 'class'], 'street_limited'],
        ['==', ['get', 'class'], 'service'],
      ],
    ],
    style: {
      'stroke-color': '#cfcdca',
      'stroke-width': 1,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'bridge'],
      ['==', ['get', 'class'], 'main'],
      ['<=', ['zoom'], 11],
    ],
    style: {
      'stroke-color': '#e9ac77',
      'stroke-width': 1,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'bridge'],
      ['==', ['get', 'class'], 'path'],
    ],
    style: {
      'stroke-color': '#cba',
      'stroke-width': 1,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'bridge'],
      ['==', ['get', 'class'], 'major_rail'],
    ],
    style: {
      'stroke-color': '#bbb',
      'stroke-width': 2,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'admin'],
      ['>=', ['get', 'admin_level'], 2],
      ['==', ['get', 'maritime'], 0],
    ],
    style: {
      'stroke-color': '#9e9cab',
      'stroke-width': 1,
    },
  },
  {
    filter: [
      'all',
      ['==', ['source-layer'], 'admin'],
      ['>=', ['get', 'admin_level'], 2],
      ['==', ['get', 'maritime'], 1],
    ],
    style: {
      'stroke-color': '#a0c8f0',
      'stroke-width': 1,
    },
  },
  {
    style: {
      'circle-radius': 4,
      'circle-fill-color': '#777',
    },
  },
];
