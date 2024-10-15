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

function createRulesToOlStyles(rules) {
    if (!rules) {
        return null;
    }

    let compiledRules = 
        
    let symbolStyles = []; // symbol 관련 스타일 규칙
    let flatStyles = [];   // 일반 style 규칙

    for (const rule of rules) {
        if (rule.symbol) {
            // symbol이 존재하는 경우
            const processedSymbol = processSymbol(rule.symbol); // ol flatStyle 형태로 변경 시도
            if (processedSymbol) {// filter를 적용하여 processedSymbol을 처리
                flatStyles.push(...processedSymbol.map(style => ({ filter: rule.filter, ...style })));
            } else {// filter 기반의 스타일 함수로 변환하여 저장
                symbolStyles.push(rule);
            }
        } else if (rule.style) {
            flatStyles.push({ filter: rule.filter, ...rule.style });
        }
    }

    return [
        ...(symbolStyles.length ? [rulesToStyleFunction(symbolStyles)] : []),
        ...(flatStyles.length ? [flatStyles] : [])
    ];
    
}

function createRulesToOlStyles(rules) {
    if (!rules) {
        return null;
    }

    const compiledRules = {
        canvas: [],  // canvas 관련 규칙 저장
        webgl: []    // webgl 관련 규칙 저장
    };

    for (const rule of rules) {
        if (rule.symbol) {
            // symbol이 존재하는 경우
            const processedSymbol = processSymbol(rule.symbol); // ol flatStyle 형태로 변경 시도
            if (processedSymbol) {// filter를 적용하여 processedSymbol을 처리
                compiledRules.webgl.push(...processedSymbol.map(style => ({ filter: rule.filter, ...style })));
            } else {// filter 기반의 symbol 스타일 함수로 변환하여 저장
                compiledRules.canvas.push(rule);
            }
        } else if (rule.style) {
            compiledRules.webgl.push({ filter: rule.filter, ...rule.style });
        }
    }

    // compiledRules의 canvas와 webgl 배열을 배열로 반환
    return [
        ...(compiledRules.canvas.length ? [rulesToStyleFunction(compiledRules.canvas)] : []),
        ...(compiledRules.webgl.length ? [compiledRules.webgl] : [])
    ];
}
