import VectorTile from 'ol/VectorTile';

// VectorTile 객체 생성
const tile = new VectorTile();

if (!tile.customMethod) {
  tile.customMethod = (() => {
    let internalData = null;

    return function (action, data) {
      if (action === 'set') {
        internalData = data;
      } else if (action === 'get') {
        if (!internalData) {
          internalData = [];
        }
        return internalData;
      }
    };
  })();
}

// 데이터 설정 및 유지
tile.customMethod('set', [10, 20, 30]);
console.log(tile.customMethod('get')); // 출력: [10, 20, 30]

// `customMethod`가 이미 존재하므로 덮어쓰지 않음
if (!tile.customMethod) {
  tile.customMethod = () => {}; // 실행되지 않음
}

console.log(tile.customMethod('get')); // 출력: [10, 20, 30]
