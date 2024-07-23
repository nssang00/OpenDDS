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


function createStrokePatternStyle(strokepattenstyle) {
    const { 'stroke-pattern-src': imageSrc, 'stroke-width': width } = strokepattenstyle;

    // 이미지 객체 생성
    const img = new Image();
    img.src = imageSrc;

    // 이미지 로드 대기
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 16;  // 패턴의 너비
    patternCanvas.height = 16;  // 패턴의 높이
    const ctx = patternCanvas.getContext('2d');

    // 이미지가 로드될 때까지 대기
    const loadImageSynchronously = () => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', imageSrc, false);  // 동기 요청
        xhr.responseType = 'blob';

        try {
            xhr.send();
            if (xhr.status === 200) {
                const blob = xhr.response;
                const objectUrl = URL.createObjectURL(blob);
                img.src = objectUrl;

                img.onload = function() {
                    ctx.drawImage(img, 0, 0, patternCanvas.width, patternCanvas.height);
                    const pattern = ctx.createPattern(patternCanvas, 'repeat');
                    return {
                        'stroke-color': pattern,
                        'stroke-width': width
                    };
                };
            } else {
                throw new Error('이미지를 로드할 수 없습니다.');
            }
        } catch (error) {
            console.error(error);
            return null;
        }
    };

    loadImageSynchronously();

    // 이미지가 동기적으로 로드되면서 반환
    return {
        'stroke-color': ctx.createPattern(patternCanvas, 'repeat'),
        'stroke-width': width
    };
}

// 사용 예시
const strokepattenstyle = {
    'stroke-pattern-src': 'path/to/your/image.png',  // 이미지 경로
    'stroke-width': 1.5,
};

const style = createStrokePatternStyle(strokepattenstyle);
console.log(style);
