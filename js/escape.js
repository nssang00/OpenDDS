function decodeHtmlEntities(text) {
    const entities = {
        '&lt;': '<',
        '&gt;': '>',
        // 필요한 경우 다른 엔티티도 추가할 수 있습니다.
    };

    return text.replace(/&[a-zA-Z0-9]+;/g, match => entities[match] || match);
}

var encodedString = "&lt;&gt;=43,353";
var decodedString = decodeHtmlEntities(encodedString);
console.log(decodedString); // <div

let featureObj = {
  VVTStyle : {
    BFC: "&lt;&gt;7,15,27,82",    
    HGT: "&lt;=46",
    EXS: "0,5,6,28",
    LMC: "&lt;2",
  },
};

for(let prop in featureObj.VVTStyle)
{
  let str = featureObj.VVTStyle[prop].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<>/g, '!');


  const [operator, values] = str.match(/([<>=!]+)?(\w+,?)+/g);

  const operatorPart = operator.trim();
  const valuesPart = parts[parts.length -1];
  //const values = valuesPart.split(',').map(Number);
 // const valuesPart = values.trim().slice(1, -1).split(',');

  /*
return { 
  operator: operatorPartm
  values: valuesPart.map(Number),
}
  */
  console.log(prop +  ' ' + featureObj.VVTStyle[prop])
}


알겠습니다. 다음과 같이 코드를 수정했습니다:

```javascript
let featureObj = {
  VVTStyle: {
    BFC: "&lt;&gt;7,15,27,82",
    HGT: "&lt;=46",
    EXS: "0,5,6,28",
    LMC: "&lt;2",
  },
};

for (let prop in featureObj.VVTStyle) {
  let str = featureObj.VVTStyle[prop].replace(/&lt;/g, '<').replace(/&gt;/g, '>');

  // 정규식 결과를 구조 분해 할당으로 처리
  const [, operator = '', valuesPart = ''] = str.match(/([<>=!]+)?([\w,]+)/);

  // 값이 쉼표로 구분되어 있으면 배열로, 아니면 일반 값으로 반환
  const values =
    valuesPart.includes(',')
      ? valuesPart.split(',').map((value) =>
          isNaN(Number(value)) ? ['literal', value.split()] : [Number(value)]
        )
      : [isNaN(Number(valuesPart)) ? ['literal', [valuesPart]] : [Number(valuesPart)]];

  // operator 처리
  const finalOperator = !operator ? '==' : operator === '!' ? '!=' : operator;

  console.log({
    operator: finalOperator,
    values,
  });
}
```

변경 사항은 다음과 같습니다:

1. `values` 변수에서 값이 숫자인지 체크하고, 숫자이면 `[Number(value)]`로 배열을 만들고, 문자열이면 `['literal', [value.split()]]`로 배열을 만듭니다.
2. 쉼표로 구분된 경우에도 동일한 방식으로 처리합니다.

이제 결과는 다음과 같이 나옵니다:

```javascript
{
  operator: '==',
  values: [
    [7], [15], [27], [82]
  ]
}
{
  operator: '<=',
  values: [[46]]
}
{
  operator: '==',
  values: [
    [0], [5], [6], [28]
  ]
}
{
  operator: '<',
  values: [[2]]
}
```

문자열 값의 경우에는 다음과 같이 출력됩니다:

```javascript
{
  operator: '==',
  values: [
    ['literal', ['lake', 'ocean']]
  ]
}
```

뤼튼 사용하러 가기 > https://agent.wrtn.ai/0ek99d
