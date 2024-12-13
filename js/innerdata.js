import VectorTile from 'ol/VectorTile';

class MyTile {
  constructor() {
    this.features = ['feature1', 'feature2', 'feature3']; // MyTile 클래스 내부 변수
  }

  upload() {
    // VectorTile 객체 생성
    const tile = new VectorTile();

    // tile.customMethod가 없으면 추가
    if (!tile.customMethod) {
      tile.customMethod = (() => {
        let internalData = null;

        // 화살표 함수로 정의하여 `this`가 MyTile 인스턴스를 참조
        return (action, data) => {
          if (action === 'set') {
            internalData = data;
          } else if (action === 'get') {
            if (!internalData) {
              internalData = [];
            }
            console.log('Accessing MyTile features:', this.features);  // this.features에 접근
            return internalData;
          }
        };
      })();
    }

    // customMethod 호출
    tile.customMethod('get');  // this.features에 접근하려면 'get' 호출
  }
}

// MyTile 객체 생성
const myTileInstance = new MyTile();

// upload 함수 호출
myTileInstance.upload();

////////////
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
