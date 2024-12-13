import VectorTile from 'ol/VectorTile';

// VectorTile 객체 생성
const tile = new VectorTile();

// 메서드 내부에 상태 추가
tile.customMethod = (() => {
  let internalData = null; // 함수 내부 상태

  // 메서드 정의
  return function(action, data) {
    if (action === 'set') {
      internalData = data; // 상태 저장
    } else if (action === 'get') {
      if (!internalData) {
        // 값이 없으면 새로 생성
        internalData = []; // 초기화 (필요에 따라 초기값 설정)
      }
      return internalData; // 상태 반환
    }
  };
})();

// 기존에 값이 없는 상태에서 가져오기 (자동 초기화)
console.log(tile.customMethod('get')); // 출력: []

// 데이터 설정
tile.customMethod('set', [10, 20, 30]);

// 기존에 값이 있는 상태에서 가져오기
console.log(tile.customMethod('get')); // 출력: [10, 20, 30]
