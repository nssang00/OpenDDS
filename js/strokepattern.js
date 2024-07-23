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


///////
function createStrokePatternStyle(strokepattenstyle) {
    const { 'stroke-pattern-src': imageSrc, 'stroke-width': width } = strokepattenstyle;

    // 동기적으로 기본값을 반환
    let patternStyle = null;

    // 이미지 로드 및 패턴 생성
    (async () => {
        const img = new Image();
        img.src = imageSrc;

        img.onload = () => {
            const patternCanvas = document.createElement('canvas');
            patternCanvas.width = 16;  // 패턴의 너비
            patternCanvas.height = 16;  // 패턴의 높이
            const ctx = patternCanvas.getContext('2d');

            ctx.drawImage(img, 0, 0, patternCanvas.width, patternCanvas.height);
            const pattern = ctx.createPattern(patternCanvas, 'repeat');

            patternStyle = {
                'stroke-color': pattern,
                'stroke-width': width
            };
        };

        img.onerror = () => {
            console.error('이미지를 로드할 수 없습니다.');
            patternStyle = null;  // 에러 발생 시 null 설정
        };
    })();

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
//////
async function createStrokePatternStyle(strokepattenstyle) {
    const { 'stroke-width': width } = strokepattenstyle;

    const img = new Image();
    img.src = 'path/to/your/image.png'; // 이미지 경로를 직접 지정

    // 이미지를 로드하는 Promise 반환
    const pattern = await new Promise((resolve, reject) => {
        img.onload = () => {
            const patternCanvas = document.createElement('canvas');
            patternCanvas.width = 16;  // 패턴의 너비
            patternCanvas.height = 16;  // 패턴의 높이
            const ctx = patternCanvas.getContext('2d');

            ctx.drawImage(img, 0, 0, patternCanvas.width, patternCanvas.height);
            resolve(ctx.createPattern(patternCanvas, 'repeat'));
        };

        img.onerror = () => {
            reject(new Error('이미지를 로드할 수 없습니다.'));
        };
    });

    // 패턴 스타일 반환
    return {
        'stroke-color': pattern,
        'stroke-width': width
    };
}

// 사용 예시
(async () => {
    const strokepattenstyle = {
        'stroke-width': 1.5,
    };

    try {
        const style = await createStrokePatternStyle(strokepattenstyle);
        console.log(style);  // 패턴 스타일이 출력됨
    } catch (error) {
        console.error(error.message);
    }
})();



// 동기 함수: 비동기 함수 호출 및 결과 반환
function loadAndReturnImage(src) {
    let pattern;

    (async () => {
        // 비동기 함수: 이미지 로드를 기다림
        const loadImage = (src) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    pattern = ctx.createPattern(img, 'repeat');
                    resolve(pattern);
                };
                img.onerror = reject;
                img.src = src;
            });
        };

        try {
            await loadImage(src);
        } catch (error) {
            console.error('이미지를 로드하는 동안 오류가 발생했습니다:', error);
        }
    })();

    return pattern;
}

// 사용 예시
const imageUrl = 'https://example.com/path/to/image.jpg';
const pattern = loadAndReturnImage(imageUrl);

// pattern은 아직 null이므로 이후 적절한 시점에 pattern을 사용해야 함
// 예: 패턴 생성이 완료된 후 pattern에 접근
setTimeout(() => {
    if (pattern) {
        const canvas = document.querySelector('canvas');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        console.log('패턴 생성 실패');
    }
}, 1000);
