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
