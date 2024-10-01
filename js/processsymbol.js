// processDoubleLineType 함수는 배열을 리턴
function processDoubleLineType(symbol) {
  if (symbol && symbol['double-line-type'] !== undefined) {
    switch (symbol['double-line-type']) {
      case 0:
        return [{ type: 'double-line-0' }, { type: 'double-line-0-alt' }];
      case 3:
        return [{ type: 'double-line-3' }, { type: 'double-line-3-alt' }];
      case 4:
        return [{ type: 'double-line-4' }, { type: 'double-line-4-alt' }];
      default:
        return [];
    }
  }
  return [];
}

// 호출한 곳에서 반환된 배열에 filter 속성을 추가
let result = processDoubleLineType(flatstyles.symbol).map(item => ({
  ...item, // 기존 아이템을 유지
  filter: 'aaa' // filter 속성 추가
}));


function processSymbol(symbol) {
  const baseStroke = {
    'stroke-color': symbol.colr,
    'stroke-width': symbol.width,
  };

  const symbolTypeSettings = {
    0: [-0.5, 0.5],  // 양쪽
    3: [0.5],        // 왼쪽만
    4: [-0.5],       // 오른쪽만
  };

  if (!(symbol.type in symbolTypeSettings)) {
    throw new Error(`지원되지 않는 심볼 타입 ${symbol.type}`);
  }

  return symbolTypeSettings[symbol.type].map(multiplier => ({
    ...baseStroke,
    'stroke-offset': symbol.offset * multiplier,
  }));
}
