// 예시 객체
const style = {
    'icon-src': '{basePath}/aaa.png',
    'stroke-pattern-src': '{basePath}/stroke-pattern.svg',
    'fill-pattern-src': '{basePath}/fill-pattern.svg',
    'background-color': 'red'
};

// basePath 값 (이 값을 실제 경로로 설정해야 함)
const basePath = 'http://example.com/assets';

// 변환 함수
function resolvePaths(obj, basePath) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key) && key.endsWith('-src')) {
            obj[key] = obj[key].replace(/{basePath}/g, basePath); // {basePath}를 실제 값으로 변환
        }
    }
    return obj;
}

// 변환 후 결과
const resolvedStyle = resolvePaths(style, basePath);
console.log(resolvedStyle);
