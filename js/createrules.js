function createRulesToOlStyles(rules)
{
    if (!rules) {
        return null;
    }
  
    let compiledRules = [];
    for (const rule of rules) {
        let compiledRule = null;
        if(rule.symbol) {//symbol 이 존재할경우
            const processedSymbol = processSymbol(rule.symbol);// ol flatStyle형태로 변경처리 시도
            if(processedSymbol)//filter처리 
                compiledRule = processedSymbol.map(style => ({filter: rule.filter, ...style}));
            else//filter기반 스타일 함수로 변환시도
                compiledRule = rulesToStyleFunction([rule]);
        }
        else {
            if(rule.style) {//style이 존재할경우 webgl flatstyle은 style 을 복사.
                compiledRule = {filter: rule.filter,...rule.style}
            }
        }
        if(compiledRule !== null)
            compiledRules.push(compiledRule);
    }
  
    return compiledRules;
}
