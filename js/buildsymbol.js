function buildFormatter(options) {
  const label = options;

  return function(text) {
    let num = parseFloat(text);
    if (!isNaN(num)) {  
      if(label.decimal >= 0)
        text = num.toFixed(label.decimal);
      if(label.subscript)
      {
        const [integerPart, decimalPart] = text.split('.');
        const subscriptNumbers = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
        text = integerPart;
        const subscriptDecimal = decimalPart?.split('').map(char => subscriptNumbers[parseInt(char)]).join(''); 
        if(subscriptDecimal)
          text = text + '.' + subscriptDecimal;
      }
    }
  
    let result = (label?.prefix ? label.prefix : '') + text + (label?.postfix ? label.postfix : '');
    if (label.underline) {
      result = result.split('').map((char) => char + '\u0332').join('');
    }
    return result;
  };
}

function rulesToStyleFunction(rules) {
  const parsingContext = {
    variables: new Set(),
    properties: new Set(),
    geometryType: false,
    style: {},
  };
  let labelFormatter;
  for (const rule of rules) {
    const symbolType = rule['symbol-type'];
    if(symbolType)
    {
      if(symbolType === 'label')
      {
        labelFormatter = buildFormatter({
          prefix: rule['symbol-label-prefix'],
          postfix: rule['symbol-label-postfix'],
          decimal: rule['symbol-label-decimal'],
          underline: rule['symbol-label-underline'],
          subscript: rule['symbol-label-sea-water-level'],
        });
      }

    }

  }

  const evaluator = buildRuleSet(rules, parsingContext);
  const evaluationContext = {
    variables: {},
    properties: {},
    resolution: NaN,
  };
  return function (feature, resolution) {
    evaluationContext.properties = feature.getPropertiesInternal();
    evaluationContext.resolution = resolution;
    if (parsingContext.geometryType) {
      const type = feature.getGeometry().getType();
      evaluationContext.geometryType = type.startsWith("Multi") ? type.substring(5) : type;;
    }
    evaluationContext.variables['text'] = labelFormatter(feature.get('class'));
    return evaluator(evaluationContext);
  };
}


function buildSymbol(styles)
{
  for (const style of styles) {
    const symbolType = style['symbol-type'];
    switch(style['symbol-type']) {
      case "picture":
        buildPicture(style);
        break;
      case "vertical":
        buildVertical(style);
        break;
      case "double-line":
        buildDoubleLine(style);
        break;
      case "label":
        buildLabel(style);
        break;     
      default:
        break;                
    }
  }
  return function (feature) {

      const type = feature.getGeometry().getType();
    return ;
  };
}

function buildPicture(style)
{
  const textureLine = style['symbol-picture-texture-line'];
  if(textureLine === true){

  } else if(textureLine === false) {

  }
}

function buildVertical(style)
{
  const symbol = drawVerticalSymbol({
    color: style['symbol-vertical-color'],//<Color>
    width: style['symbol-vertical-width'],//<Width>
    verticalType: style['symbol-vertical-vertical-type'],//<VerticalType>
    leftLength: style['symbol-vertical-left-length'],//<LeftLength>
    rightLength: style['symbol-vertical-right-length'], //<RightLength>
    lineCap: style['symbol-vertical-line-cap'],//<StartCap>, <EndCap>
  });
  lines.push({
    'stroke-pattern-src': symbol.src,
    'stroke-width': symbol.strokeWidth,
    'stroke-offset': 0,
    'stroke-pattern-start-offset': style['symbol-vertical-start-pos'], //<StartPos>  
    'stroke-pattern-spacing': style['symbol-vertical-interval'],//<Interval>    
  });
}

function buildDoubleLine(style)
{

  switch(style['symbol-double-line-type']) {
    case 0://Simple

      break;
    case 1:

      break;
    case 2://Bridge

      break;
    case 3://Left Only

      break;
    case 4://Right Only

      break;
    case 5://Tunnel //StrokePattern, stylefunction, canvas

      break;     
    case 6://PipeLine //StrokePattern, stylefunction, canvas

      break;           
    default:
      break;                
  }  


  /*      
    style['symbol-double-line-color']: rgba,//<Color>
    style['symbol-double-line-width']: symbolizer.Width,//<Width>
    style['symbol-double-line-type']: symbolizer.Type,//<Type>
    style['symbol-double-line-space']: Number(symbolizer.Space), //<Space>
    style['symbol-double-line-line-join']: lineJoins[Number(symbolizer.JoinType)],//<JoinType> 0:miter, 1:bevel, 2:round

  if(symbolizer.Type === 0)//Simple
  {           
    //for (let i = -1; i <= 1; i += 2) {
      //'stroke-offset': (style['symbol-double-line-space'] / 2) * i,
    lines.push({
      'stroke-color': style['symbol-double-line-color'],//<Color>
      'stroke-width': style['symbol-double-line-width'],//<Width>
      'stroke-offset': style['symbol-double-line-space']/2, //<Space>/2
      'stroke-line-join': style['symbol-double-line-line-join'],//<JoinType> 0:miter, 1:bevel, 2:round
    };   
    lines.push({
      'stroke-color': style['symbol-double-line-color'],//<Color>
      'stroke-width': style['symbol-double-line-width'],//<Width>
      'stroke-offset': -(style['symbol-double-line-space']/2), //<Space>/2
      'stroke-line-join': style['symbol-double-line-line-join'],//<JoinType> 0:miter, 1:bevel, 2:round
    }; 
  }
  else if(symbolizer.Type === 2)//Bridge //StrokePattern, stylefunction, canva, + doubleline(simple)
  {
    const symbol = drawDoubleLineSymbol({
      color: style['symbol-double-line-color'],//<Color>
      width: style['symbol-double-line-width'],//<Width>
      type: style['symbol-double-line-type'],//<Type>
      space: style['symbol-double-line-space'],//<Space>
      lineJoin: style['symbol-double-line-line-join'], //<JoinType>
    });
    lines.push({
      'stroke-pattern-src': symbol.src,
      'stroke-width': symbol.strokeWidth,
      'stroke-offset': 0,
      'stroke-pattern-start-offset': style['symbol-vertical-start-pos'], //<StartPos>  
      'stroke-pattern-spacing': style['symbol-vertical-interval'],//<Interval>    
    });    
  }
  else if(symbolizer.Type === 3)//Left Only
  {
    lines.push({
      'stroke-color': style['symbol-double-line-color'],//<Color>
      'stroke-width': style['symbol-double-line-width'],//<Width>
      'stroke-offset': style['symbol-double-line-space']/2, //<Space>/2
      'stroke-line-join': style['symbol-double-line-line-join'],//<JoinType> 0:miter, 1:bevel, 2:round
    };   
  }
  else if(symbolizer.Type === 4)//Right Only
  {
    lines.push({
      'stroke-color': style['symbol-double-line-color'],//<Color>
      'stroke-width': style['symbol-double-line-width'],//<Width>
      'stroke-offset': -(style['symbol-double-line-space']/2), //<Space>/2
      'stroke-line-join': style['symbol-double-line-line-join'],//<JoinType> 0:miter, 1:bevel, 2:round
    };  
  }
  else if(symbolizer.Type === 5)//Tunnel //StrokePattern, stylefunction, canvas
  {
    
  }
  else if(symbolizer.Type === 6)//PipeLine //StrokePattern, stylefunction, canvas
  {
    
  } */    
}

function buildLabel(style)
{
  labelFormatter = buildFormatter({
    prefix: rule['symbol-label-prefix'],
    postfix: rule['symbol-label-postfix'],
    decimal: rule['symbol-label-decimal'],
    underline: rule['symbol-label-underline'],
    subscript: rule['symbol-label-sea-water-level'],
  });
}

