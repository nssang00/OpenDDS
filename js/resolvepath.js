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

///////
function updateFilterToResolution(filter, dpi = 96) {
  const scaleToResolution = (scale) => scale / (dpi * (1000 / 25.4));

  return filter.map((item) =>
    Array.isArray(item)
      ? updateFilterToResolution(item, dpi) // 재귀 처리
      : item === "scale"
      ? "resolution" // "scale" 문자열 변환
      : typeof item === "number"
      ? scaleToResolution(item) // 숫자 변환
      : item // 나머지 값 그대로 유지
  );
}

// 원본 데이터
const filter = [
  "all",
  ["<=", ["scale"], 25000],
  [">", ["scale"], 50000],
  ["in", ["get", "VRR"], [0, 1, 8]]
];

// 변환 실행
const updatedFilter = updateFilterToResolution(filter);
console.log(updatedFilter);
