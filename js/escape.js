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
