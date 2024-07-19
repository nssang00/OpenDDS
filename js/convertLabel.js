function convertLabel(label) {
  let text = label.text;

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

  let result = label.prefix + text + label.postfix;
  if (label.underline) {
    result = result.split('').map((char) => char + '\u0332').join('');
  }
  return result;
}

let res = convertLabel({
  text: '35.253',
  prefix: '',
  postfix: '',
  decimal: -1,
  underline: true,
  subscript: true,
});
/////////

function createConverter(options) {
  const { prefix, postfix, decimal, underline, subscript } = options;

  return function(text) {
    let num = parseFloat(text);
    if (!isNaN(num)) {
      if (decimal >= 0) {
        text = num.toFixed(decimal);
      }
      if (subscript) {
        const [integerPart, decimalPart] = text.split('.');
        const subscriptNumbers = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
        text = integerPart;
        const subscriptDecimal = decimalPart?.split('').map(char => subscriptNumbers[parseInt(char)]).join('');
        if (subscriptDecimal) {
          text = text + '.' + subscriptDecimal;
        }
      }
    }

    let result = prefix + text + postfix;
    if (underline) {
      result = result.split('').map((char) => char + '\u0332').join('');
    }
    return result;
  };
}

let evaluator = createConverter({
  prefix: '',
  postfix: '',
  decimal: -1,
  underline: true,
  subscript: true,
});

// 사용 예시
let result = evaluator('123.35');
console.log(result);
