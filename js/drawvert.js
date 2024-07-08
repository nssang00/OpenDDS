
function drawVerticalSubType(options) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.scale(1, 1);
  canvas.width = options.width+2;//5;

  if(options.verticalType < 3)
  {
    canvas.height = Math.max(options.leftLength, options.rightLength) * 2;
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
    canvas.height = Math.max(options.leftLength, options.rightLength) * 2 + options.width;
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

const options_vertical = {
  color: 'rgba(0, 0, 0, 1)',
  width: 1,
  verticalType: 0,
  leftLength: 5,
  rightLength: 5, 
  lineCap: 'butt'
};

let vertical_result = drawVerticalSubType(options_vertical);
const line_vertical = {
  'stroke-pattern-src': vertical_result.src,//<Picture>, StartCap, EndCap
  'stroke-width': vertical_result.strokeWidth,//<Width>
  'stroke-offset': 0,
  'stroke-pattern-start-offset':20, //<StartPos>  
  'stroke-pattern-spacing': 80,//<Interval>    
};

const options_vertica_circle1 = {
  color: 'red',
  width: 3,
  verticalType: 4,
  leftLength: 5,
  rightLength: 0, 
};
let vertical_circle1_result = drawVerticalSubType(options_vertica_circle1);

const line_vertical_circle1 = {
  'stroke-pattern-src': vertical_circle1_result.src,//<Picture>
  'stroke-width': vertical_circle1_result.strokeWidth,//<Width>
  'stroke-offset': 0,
  'stroke-pattern-start-offset':17, //<StartPos>  
  'stroke-pattern-spacing': 80,//<Interval>    
};

const options_vertica_circle2 = {
  color: 'green',
  width: 3,
  verticalType: 4,
  leftLength: 5,
  rightLength: 0, 
};

let vertical_circle2_result = drawVerticalSubType(options_vertica_circle2);
const line_vertical_circle2 = {
  'stroke-pattern-src': vertical_circle2_result.src,//<Picture>
  'stroke-width': vertical_circle2_result.strokeWidth,//<Width>
  'stroke-offset': 0,
  'stroke-pattern-start-offset':23, //<StartPos>  
  'stroke-pattern-spacing': 80,//<Interval>    
};

const styles = [line_simple, line_vertical, line_vertical2, line_vertical_circle1, line_vertical_circle2];
