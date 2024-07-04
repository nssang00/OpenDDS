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

function createFontString(bold, italic, size, font) {
  let fontString = '';

  if (italic) {
    fontString += 'italic ';
  }

  if (bold) {
    fontString += 'bold ';
  }

  fontString += `${size}px ${font}`;

  return fontString;
}

// 예제 사용법
const bold = true;
const italic = false;
const size = 12;
const font = 'Arial';

const fontString = createFontString(bold, italic, size, font);
console.log(fontString); // "bold 12px Arial"

// OpenLayers 텍스트 스타일에 적용
const textStyle = new ol.style.Text({
  text: 'Hello World',
  font: fontString,
  fill: new ol.style.Fill({
    color: '#000'
  })
});

const feature = new ol.Feature({
  geometry: new ol.geom.Point([0, 0])
});

feature.setStyle(new ol.style.Style({
  text: textStyle
}));

const vectorSource = new ol.source.Vector({
  features: [feature]
});

const vectorLayer = new ol.layer.Vector({
  source: vectorSource
});

const map = new ol.Map({
  target: 'map',
  layers: [vectorLayer],
  view: new ol.View({
    center: [0, 0],
    zoom: 2
  })
});

