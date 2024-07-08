
const line_vertical2 = {
  'stroke-color': 'blue',//<Color>
  'stroke-width': 10,//<Width>
  'stroke-line-cap': 'butt',//StartCap, EndCap 0:butt, 1:square, 2:around
  'stroke-line-dash-offset': 20,//<StartPos>  
  'stroke-line-dash': [1, 40],//Interval
  'stroke-offset': 5,
  //'stroke-pattern-start-offset':23, //<StartPos>  
  //'stroke-pattern-spacing': 80,//<Interval>    
};

const vertical_result = drawVerticalSubType({
  color: 'rgba(0, 0, 0, 1)',
  width: 1,
  verticalType: 0,
  leftLength: 5,
  rightLength: 5, 
  lineCap: 'butt'
});

const line_vertical = {
  'stroke-pattern-src': vertical_result.src,//<Picture>, StartCap, EndCap
  'stroke-width': vertical_result.strokeWidth,//<Width>
  'stroke-offset': 0,
  'stroke-pattern-start-offset':20, //<StartPos>  
  'stroke-pattern-spacing': 80,//<Interval>    
};

const vertical_circle1_result = drawVerticalSubType({
  color: 'red',
  width: 3,
  verticalType: 4,
  leftLength: 5,
  rightLength: 0, 
});

const line_vertical_circle1 = {
  'stroke-pattern-src': vertical_circle1_result.src,//<Picture>
  'stroke-width': vertical_circle1_result.strokeWidth,//<Width>
  'stroke-offset': 0,
  'stroke-pattern-start-offset':17, //<StartPos>  
  'stroke-pattern-spacing': 80,//<Interval>    
};

const vertical_circle2_result = drawVerticalSubType({
  color: 'green',
  width: 3,
  verticalType: 4,
  leftLength: 5,
  rightLength: 0, 
});

const line_vertical_circle2 = {
  'stroke-pattern-src': vertical_circle2_result.src,//<Picture>
  'stroke-width': vertical_circle2_result.strokeWidth,//<Width>
  'stroke-offset': 0,
  'stroke-pattern-start-offset':23, //<StartPos>  
  'stroke-pattern-spacing': 80,//<Interval>    
};

const simple_line = {
  filter: [
    'all',
    ['==', ['get', 'layer'], 'landcover'],
    ['<=', ['resolution'], 305.748113140705],
  ],  
  'stroke-color': 'black',
  'stroke-width': 1,
  'stroke-offset': 0,  
};

const simple_line_left = {
  filter: [
    'all',
    ['==', ['get', 'layer'], 'landcover'],
    ['<=', ['resolution'], 305.748113140705],
  ],  
  'stroke-color': 'blue',
  'stroke-width': 1,
  'stroke-offset': 2,  
};

const simple_right_left = {
  filter: [
    'all',
    ['==', ['get', 'layer'], 'landcover'],
    ['<=', ['resolution'], 305.748113140705],
  ],  
  'stroke-color': 'red',
  'stroke-width': 1,
  'stroke-offset':-2,  
};
