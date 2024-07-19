function rulesToStyleFunction(rules) {
  const parsingContext = newParsingContext();
  for (const rule of rules) {
    const symbolType = rule.style['symbol-type'];




  }
  const evaluator = buildRuleSet(rules, parsingContext);
  const evaluationContext = newEvaluationContext();
  return function (feature, resolution) {
    evaluationContext.properties = feature.getPropertiesInternal();
    evaluationContext.resolution = resolution;
    evaluationContext.variables['text'] = feature.get('class');
    return evaluator(evaluationContext);
  };
}
