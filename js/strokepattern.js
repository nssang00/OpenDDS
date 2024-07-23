function createStrokePatternStyle(strokepattenstyle) {
    const { 'stroke-pattern-src': imageSrc, 'stroke-width': width } = strokepattenstyle;

    // 이미지 객체 생성
    const img = new Image();
    img.src = imageSrc;

    // 이미지가 로드될 때까지 대기
    img.onload = function() {
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 16;  // 패턴의 너비
        patternCanvas.height = 16;  // 패턴의 높이
        const ctx = patternCanvas.getContext('2d');

        ctx.drawImage(img, 0, 0, patternCanvas.width, patternCanvas.height);
        const pattern = ctx.createPattern(patternCanvas, 'repeat');

        // 스타일 객체 반환
        return {
            'stroke-color': pattern,
            'stroke-width': width
        };
    };

    // 동기적으로 반환할 수 없으므로, 호출하는 쪽에서 비동기 처리 필요
}

// 사용 예시
const strokepattenstyle = {
    'stroke-pattern-src': 'path/to/your/image.png',  // 이미지 경로
    'stroke-width': 1.5,
};

// 동기적 반환이 불가능하므로, 비동기 처리가 필요
createStrokePatternStyle(strokepattenstyle).then(style => {
    if (style) {
        console.log(style);
    }
}).catch(error => {
    console.error(error);
});


//////
function createStrokePatternStyle(strokepattenstyle) {
    const { 'stroke-pattern-src': imageSrc, 'stroke-width': width } = strokepattenstyle;

    // 동기적으로 기본값을 반환
    let patternStyle = null;

    // 이미지 로드를 위한 내부 함수
    const loadImageAndCreatePattern = (src) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;

            img.onload = () => {
                const patternCanvas = document.createElement('canvas');
                patternCanvas.width = 16;  // 패턴의 너비
                patternCanvas.height = 16;  // 패턴의 높이
                const ctx = patternCanvas.getContext('2d');

                ctx.drawImage(img, 0, 0, patternCanvas.width, patternCanvas.height);
                const pattern = ctx.createPattern(patternCanvas, 'repeat');

                resolve({
                    'stroke-color': pattern,
                    'stroke-width': width
                });
            };

            img.onerror = () => {
                reject(new Error('이미지를 로드할 수 없습니다.'));
            };
        });
    };

    // 비동기적으로 패턴을 생성하고 결과를 반환
    loadImageAndCreatePattern(imageSrc).then((style) => {
        patternStyle = style; // 패턴 스타일 설정
    }).catch((error) => {
        console.error(error);
        patternStyle = null;  // 에러 발생 시 null 설정
    });

    // 동기적으로 기본값 반환
    return patternStyle; // 초기값이므로 null이 반환될 수 있음
}

// 사용 예시
const strokepattenstyle = {
    'stroke-pattern-src': 'path/to/your/image.png',  // 이미지 경로
    'stroke-width': 1.5,
};

// 동기적으로 호출
const style = createStrokePatternStyle(strokepattenstyle);
console.log(style);  // 초기값인 null 또는 undefined가 출력될 수 있음

// 실제 사용 예시에서는 Promise를 사용하거나, 이후에 결과를 처리해야 함
