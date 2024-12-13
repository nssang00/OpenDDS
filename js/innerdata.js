import VectorTile from 'ol/VectorTile';

// VectorTile 객체 생성
const tile = new VectorTile();

// 함수 내부에 상태 유지
tile.manageData = (() => {
  // 함수 내부 상태 (클로저로 관리)
  let internalData = {};

  // 반환할 함수
  return (action, key, value) => {
    if (action === 'set') {
      internalData[key] = value; // 데이터 설정
    } else if (action === 'get') {
      return internalData[key]; // 데이터 가져오기
    }
  };
})();

// 데이터 설정
tile.manageData('set', 'transformedData', [1, 2, 3].map(x => x * 2));

// 데이터 가져오기
console.log(tile.manageData('get', 'transformedData')); // 출력: [2, 4, 6]
