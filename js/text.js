function formatString(input, prefix, postfix, decimal, underline) {
  // Prefix와 Postfix 추가
  let result = prefix + input + postfix;

  // 소수점 이하 자릿수 조정
  if (decimal >= 0) {
    const num = parseFloat(input);
    if (!isNaN(num)) {
      result = prefix + num.toFixed(decimal) + postfix;
    }
  }

  // 밑줄 추가
  if (underline) {
    result = result.split('').map(char => char + '\u0332').join('');
  }

  return result;
}

// 예제 사용법
const input = "123.456789";
const prefix = "Prefix-";
const postfix = "-Postfix";
const decimal = 2;
const underline = true;

const formattedString = formatString(input, prefix, postfix, decimal, underline);
console.log(formattedString);
