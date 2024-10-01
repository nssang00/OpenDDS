// ... 기존 코드 ...

// ... 기존 코드 유지 ...

// 새로운 함수 추가
export function extendedRulesToStyleFunction(rules) {
  const baseStyleFunction = rulesToStyleFunction(rules);

  function processSymbols(feature, resolution) {
    return rules.reduce((styles, rule) => {
      if (rule.filter({ properties: feature.getProperties(), resolution }) && rule.symbol) {
        const symbolStyle = createSymbolStyle(rule.symbol, feature);
        if (symbolStyle) {
          styles.push(symbolStyle);
        }
      }
      return styles;
    }, []);
  }

  return function(feature, resolution) {
    const baseStyles = baseStyleFunction(feature, resolution);
    const symbolStyles = processSymbols(feature, resolution);
    return baseStyles.concat(symbolStyles);
  };
}

function createSymbolStyle(symbolConfig, feature) {
  const type = symbolConfig.type;
  
  switch (type) {
    case 'circle':
      return createCircleStyle(symbolConfig);
    case 'icon':
      return createIconStyle(symbolConfig);
    case 'text':
      return createTextStyle(symbolConfig, feature);
    // 다른 symbol 타입들에 대한 처리를 추가할 수 있습니다.
    default:
      console.warn(`Unsupported symbol type: ${type}`);
      return null;
  }
}

function createCircleStyle(config) {
  return new Style({
    image: new Circle({
      radius: config.radius || 5,
      fill: new Fill({ color: config.fillColor || 'rgba(0, 0, 255, 0.1)' }),
      stroke: new Stroke({ color: config.strokeColor || 'blue', width: config.strokeWidth || 1 })
    })
  });
}

function createIconStyle(config) {
  return new Style({
    image: new Icon({
      src: config.src,
      scale: config.scale || 1,
      opacity: config.opacity || 1
    })
  });
}

function createTextStyle(config, feature) {
  return new Style({
    text: new Text({
      text: config.text || feature.get(config.textProperty) || '',
      font: config.font || '12px Calibri,sans-serif',
      fill: new Fill({ color: config.fillColor || 'black' }),
      stroke: new Stroke({ color: config.strokeColor || 'white', width: config.strokeWidth || 3 })
    })
  });
}

// ... 나머지 코드 ...
/////////////
export function rulesToStyleFunction(rules) {
  const parsingContext = newParsingContext();
  const evaluator = buildRuleSet(rules, parsingContext);
  const evaluationContext = newEvaluationContext();

  // symbol 처리를 위한 함수
  function processSymbols(context) {
    return rules.reduce((styles, rule) => {
      if (rule.filter(context) && rule.symbol) {
        const symbolStyle = createSymbolStyle(rule.symbol);
        if (symbolStyle) {
          styles.push(symbolStyle);
        }
      }
      return styles;
    }, []);
  }

  return function (feature, resolution) {
    evaluationContext.properties = feature.getPropertiesInternal();
    evaluationContext.resolution = resolution;
    if (parsingContext.featureId) {
      const id = feature.getId();
      if (id !== undefined) {
        evaluationContext.featureId = id;
      } else {
        evaluationContext.featureId = null;
      }
    }
    if (parsingContext.geometryType) {
      evaluationContext.geometryType = computeGeometryType(
        feature.getGeometry(),
      );
    }
    
    // 기존 evaluator와 symbol 처리를 직접 조합
    return evaluator(evaluationContext).concat(processSymbols(evaluationContext));
  };
}

function createSymbolStyle(symbolConfig) {
  const type = symbolConfig.type;
  
  switch (type) {
    case 'circle':
      return createCircleStyle(symbolConfig);
    case 'icon':
      return createIconStyle(symbolConfig);
    case 'text':
      return createTextStyle(symbolConfig);
    // 다른 symbol 타입들에 대한 처리를 추가할 수 있습니다.
    default:
      console.warn(`Unsupported symbol type: ${type}`);
      return null;
  }
}

function createCircleStyle(config) {
  return new Style({
    image: new Circle({
      radius: config.radius || 5,
      fill: new Fill({ color: config.fillColor || 'rgba(0, 0, 255, 0.1)' }),
      stroke: new Stroke({ color: config.strokeColor || 'blue', width: config.strokeWidth || 1 })
    })
  });
}

function createIconStyle(config) {
  return new Style({
    image: new Icon({
      src: config.src,
      scale: config.scale || 1,
      opacity: config.opacity || 1
    })
  });
}

function createTextStyle(config) {
  return new Style({
    text: new Text({
      text: config.text || '',
      font: config.font || '12px Calibri,sans-serif',
      fill: new Fill({ color: config.fillColor || 'black' }),
      stroke: new Stroke({ color: config.strokeColor || 'white', width: config.strokeWidth || 3 })
    })
  });
}

// ... 나머지 코드 ...
