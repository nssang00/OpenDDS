function convertLabel(label) {
  let text = label.text;
 // let result = label.prefix + label.text + label.postfix;

  if (label.decimal >= 0 || label.subscript >= 1) {
    let num = parseFloat(text);
    if (!isNaN(num)) {
      if(label.decimal >= 0)
        text = num.toFixed(label.decimal);
      const [integerPart, decimalPart] = text.split('.');
      const subscriptNumbers = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
      const subscriptDecimal = decimalPart.split('').map(char => subscriptNumbers[parseInt(char)]).join('');  

      text = integerPart + '.' + subscriptDecimal;
    }
  }

  let result = label.prefix + text + label.postfix;
  if (label.underline) {
    result = result.split('').map((char) => char + '\u0332').join('');
  }
  return result;
}

let res = convertLabel({
  text: '35.234',
  prefix: '',
  postfix: '',
  decimal: 2,
  underline: false,
});
