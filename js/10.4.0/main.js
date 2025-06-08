import Map from 'ol/Map.js';
import View from 'ol/View.js';
import MVT from 'ol/format/MVT.js';
import WebGLVectorTileLayer from 'ol/layer/WebGLVectorTile.js';
import VectorTileLayer from 'ol/layer/VectorTile.js';
import VectorTileSource from 'ol/source/VectorTile.js';
import {TileDebug} from 'ol/source.js';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';

const line1 = {
  //filter: ['==', ['get', 'layer'], 'waterway'],
  filter: [
    'all',
    ['<', ['resolution'], 600],    
    ['in', ['get', 'class'], ['literal', ['lake', 'river']]],
    ['==', ['get', 'layer'], 'waterway'],
    //['==', ['geometry-type'], 'Polygon'],
  ],      
  style: {
    'stroke-color': 'red',
    'stroke-width': 2,
  },
}

const line2 = {
  //filter: ['==', ['get', 'layer'], 'water'],
  filter: [
    'all',
    ['<', ['resolution'], 600],    
    ['in', ['get', 'class'], ['literal', ['lake', 'river']]],
    ['==', ['get', 'layer'], 'waterway'],
    //['==', ['geometry-type'], 'Polygon'],
  ],      
  style: {
    'fill-color': 'blue',
  },
}

const line3 = {
  /*
  filter: [
    'all',
    ['==', ['get', 'layer'], 'transportation'],
    //['==', ['get', 'class'], 'motorway'],
    ['<=', ['resolution'], 4891.96981025128],
  ],
  */
  filter: [
    'all',
    ['<', ['resolution'], 600],    
    ['==', ['get', 'layer'], 'transportation'],
    //['==', ['geometry-type'], 'Polygon'],
  ],     
  style: {
    'stroke-color': '#e9ac77',
    'stroke-width': 1,
  },
}

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
    'stroke-color': 'red',
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
    'fill-color': 'orange',
    'stroke-color': 'red',
    'stroke-width': 2,    
  },
}

const style2 = [line1, line2, line3];

const vertical_result = drawVerticalSubType({
  color: 'rgba(0, 0, 0, 1)',
  width: 1,
  verticalType: 0,
  leftLength: 7,
  rightLength: 7, 
  lineCap: 'butt'
});

const line_vertical = {
  filter: [
    'all',
    ['<', ['resolution'], 600],    
    //['in', ['get', 'class'], ['literal', ['lake', 'river']]],
    ['==', ['get', 'layer'], 'waterway'],
    //['==', ['geometry-type'], 'Polygon'],
  ],  
  style: {  
  'stroke-pattern-src': vertical_result.src,//<Picture>, StartCap, EndCap
  'stroke-width': vertical_result.strokeWidth,//<Width>
  'stroke-offset': 0,
  'stroke-pattern-start-offset':20, //<StartPos>  
  'stroke-pattern-spacing': 40,//<Interval>    
  }
};

const line_vertical2 = {
  filter: [
    'all',
    ['<', ['resolution'], 600],    
    ['in', ['get', 'class'], ['literal', ['lake', 'river']]],
    ['==', ['get', 'layer'], 'waterway'],
    //['==', ['geometry-type'], 'Polygon'],
  ],  
  style: {
  'stroke-color': 'orange',//<Color>
  'stroke-width': 10,//<Width>
  'stroke-line-cap': 'butt',//StartCap, EndCap 0:butt, 1:square, 2:around
  'stroke-line-dash-offset': 20,//<StartPos>  
  'stroke-line-dash': [1, 40],//Interval
  'stroke-offset': 5,
  'stroke-pattern-start-offset':23, //<StartPos>  
  'stroke-pattern-spacing': 80,//<Interval>    
  }
};

const vertical_circle1_result = drawVerticalSubType({
  color: 'red',
  width: 3,
  verticalType: 4,
  leftLength: 5,
  rightLength: 0, 
});

const line_vertical_circle1 = {
  filter: [
    'all',
    ['<', ['resolution'], 600],    
    //['in', ['get', 'class'], ['literal', ['lake', 'river']]],
    ['==', ['get', 'layer'], 'waterway'],
    //['==', ['geometry-type'], 'Polygon'],
  ],  
  style: {
  'stroke-pattern-src': vertical_circle1_result.src,//<Picture>
  'stroke-width': vertical_circle1_result.strokeWidth,//<Width>
  'stroke-offset': 0,
  'stroke-pattern-start-offset':17, //<StartPos>  
  'stroke-pattern-spacing': 80,//<Interval>    
  }
};

const vertical_circle2_result = drawVerticalSubType({
  color: 'green',
  width: 3,
  verticalType: 4,
  leftLength: 5,
  rightLength: 0, 
});

const line_vertical_circle2 = {
  filter: [
    'all',
    ['<', ['resolution'], 600],    
    //['in', ['get', 'class'], ['literal', ['lake', 'river']]],
    ['==', ['get', 'layer'], 'waterway'],
    //['==', ['geometry-type'], 'Polygon'],
  ],  
  style: {
  'stroke-pattern-src': vertical_circle2_result.src,//<Picture>
  'stroke-width': vertical_circle2_result.strokeWidth,//<Width>
  'stroke-offset': 0,
  'stroke-pattern-start-offset':23, //<StartPos>  
  'stroke-pattern-spacing': 80,//<Interval>  
  }  
};

const landcover = {
  filter: ['==', ['get', 'layer'], 'landcover'],
  style: {
    'fill-color': 'yellow',
    'stroke-color': 'red',
    'stroke-width': 2,    
  },
}
const landuse = {
  filter: ['==', ['get', 'layer'], 'landuse'],
  style: {
    'fill-color': 'orange',
    'stroke-color': 'red',
    'stroke-width': 2,    
  },
}

const park = {
  filter: ['==', ['get', 'layer'], 'park'],
  style: {
    'fill-color': 'green',
    'stroke-color': 'red',
    'stroke-width': 2,    
  },
}

const boundary = {
  filter: ['==', ['get', 'layer'], 'boundary'],   
  style: {
    'stroke-color': 'blue',
    'stroke-width': 1,
  },
}

const waterway = {
  filter: ['==', ['get', 'layer'], 'waterway'],   
  style: {
    'stroke-color': 'blue',
    'stroke-width': 1,
  },
}

const transportation = {
  filter: ['==', ['get', 'layer'], 'transportation'],   
  style: {
    'stroke-color': 'red',
    'stroke-width': 1,
  },
}


//const styles = [ polygon1, polygon2, line1, line_vertical2, line_vertical, line_vertical_circle1, line_vertical_circle2];
const styles = [ landcover, landuse, boundary, transportation, waterway, park]
const map = new Map({
  layers: [
    //new TileLayer({
    //  source: new OSM(),
    //}),
    new TileLayer({
      source: new TileDebug(),
    }),
    new WebGLVectorTileLayer({
      source: new VectorTileSource({
        format: new MVT(),
        url: 'https://api.maptiler.com/tiles/v3/{z}/{x}/{y}.pbf?key=get_your_own_D6rA4zTHduk6KOKTXzGB',
      }),
      style:styles,
    }),
  ],
  target: 'map',
  view: new View({
    center: [1825927.7316762917, 6143091.089223046],
    zoom: 9,
  }),
});


function drawVerticalSubType(options) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.scale(1, 1);
  canvas.width = 5;//options.width+2;//5;
  canvas.height = 20;//options.width+2;//5;

  if(options.verticalType < 3)
  {
    //canvas.height = Math.max(options.leftLength, options.rightLength) * 2;
    const centerY = canvas.height / 2;

    ctx.lineWidth = options.width;
    ctx.strokeStyle = options.color;
    ctx.lineCap = options.lineCap; // butt, square, round 

  
    ctx.beginPath();
    if(options.leftLength > 0)
    {
      ctx.moveTo(canvas.width / 2, centerY);
      ctx.lineTo(canvas.width / 2, centerY - options.leftLength);
    }
  
    if(options.rightLength > 0)
    {
      ctx.moveTo(canvas.width / 2, centerY);
      ctx.lineTo(canvas.width / 2, centerY + options.rightLength);
    }
    ctx.stroke();  
  }
  else
  {
    //canvas.height = Math.max(options.leftLength, options.rightLength) * 2 + options.width;
    const centerY = canvas.height / 2;    
    ctx.translate(canvas.width / 2, 0);
  
    ctx.fillStyle = options.color;  
  
    if(options.leftLength > 0)
    {
      ctx.arc(0, centerY - options.leftLength, options.width / 2, 0, 2 * Math.PI);
    }
    if(options.rightLength > 0)
    {  
      ctx.arc(0, centerY + options.rightLength, options.width / 2, 0, 2 * Math.PI);
    }
    ctx.fill();
  }

  return {
    src: canvas.toDataURL('image/png'),
    strokeWidth: canvas.height,
  }
}