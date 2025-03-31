class WebGL2RenderingContext2D {
    constructor(canvas) {
        // 기존 코드 유지
        this._lineDash = []; // 대시 패턴 배열 (예: [5, 10]은 5px 실선, 10px 공백)
        this._lineDashOffset = 0; // 대시 오프셋
    }

    // 대시 패턴 설정
    setLineDash(segments) {
        if (Array.isArray(segments)) {
            this._lineDash = segments.slice(); // 배열 복사
        }
    }

    // 대시 오프셋 설정
    set lineDashOffset(offset) {
        this._lineDashOffset = offset;
    }

    get lineDashOffset() {
        return this._lineDashOffset;
    }

    // 대시 패턴 반환
    getLineDash() {
        return this._lineDash.slice();
    }
}

/////
function getPathStrokeBufferData(path, width, isClosed, indexOffset, lineJoin, lineCap, lineDash = [], lineDashOffset = 0) {
    const result = computeNormalAndLength(path);
    const positions = [];
    const indices = [];

    // 대시 패턴이 없으면 기존 로직 사용
    if (lineDash.length === 0) {
        // 기존 로직 (기존 코드 그대로 사용)
        // ... (기존 코드 유지)
        return { positions, indices };
    }

    // 대시 패턴의 총 길이 계산
    const dashPatternLength = lineDash.reduce((sum, val) => sum + val, 0);
    if (dashPatternLength === 0) return { positions, indices }; // 유효하지 않은 패턴

    // 경로의 총 길이 계산
    let totalLength = 0;
    for (let i = 1; i < result.points.length; i++) {
        const [x1, y1] = result.points[i - 1];
        const [x2, y2] = result.points[i];
        totalLength += Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    // 오프셋 적용
    let currentOffset = lineDashOffset % dashPatternLength;
    if (currentOffset < 0) currentOffset += dashPatternLength;

    // 각 선분을 대시 패턴에 따라 처리
    let accumulatedLength = 0;
    for (let i = 1; i < result.points.length; i++) {
        const [x1, y1] = result.points[i - 1];
        const [x2, y2] = result.points[i];
        const segmentLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const dirX = (x2 - x1) / segmentLength;
        const dirY = (y2 - y1) / segmentLength;
        const [nx, ny] = result.normals[i - 1];

        let segmentOffset = accumulatedLength;
        accumulatedLength += segmentLength;

        // 대시 패턴 적용
        let t = 0;
        while (t < segmentLength) {
            let dashIdx = 0;
            let patternPos = currentOffset + t;

            while (patternPos >= dashPatternLength) {
                patternPos -= dashPatternLength;
            }

            // 현재 위치에서 대시/공백 계산
            while (patternPos > lineDash[dashIdx]) {
                patternPos -= lineDash[dashIdx];
                dashIdx = (dashIdx + 1) % lineDash.length;
            }

            const isDash = dashIdx % 2 === 0; // 짝수 인덱스는 실선, 홀수는 공백
            if (!isDash) {
                t += lineDash[dashIdx] - patternPos; // 공백은 건너뜀
                continue;
            }

            const dashStart = t;
            const dashEnd = Math.min(t + (lineDash[dashIdx] - patternPos), segmentLength);
            t = dashEnd;

            // 대시 세그먼트 생성
            const startX = x1 + dirX * dashStart;
            const startY = y1 + dirY * dashStart;
            const endX = x1 + dirX * dashEnd;
            const endY = y1 + dirY * dashEnd;

            // 대시 세그먼트의 버텍스 추가
            positions.push(
                startX + nx * width / 2, startY + ny * width / 2,
                startX - nx * width / 2, startY - ny * width / 2,
                endX + nx * width / 2, endY + ny * width / 2,
                endX - nx * width / 2, endY - ny * width / 2
            );

            const baseIdx = positions.length / 2 - 4 + indexOffset;
            indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
            indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
        }
    }

    // 닫힌 경로와 lineJoin/lineCap은 대시에서는 단순화 (필요시 별도 처리 가능)
    return { positions, indices };
}

///////////
class Path {
    // ... 기존 코드 유지

    getStrokeBufferData() {
        let positions = [];
        let indices = [];
        const width = this.ctx.lineWidth;
        const lineJoin = this.ctx.lineJoin;
        const lineCap = this.ctx.lineCap;
        const lineDash = this.ctx.getLineDash(); // 추가
        const lineDashOffset = this.ctx.lineDashOffset; // 추가

        for (const path of this.paths) {
            if (path.length < 2) continue;
            const indexOffset = positions.length / 2;
            const pathData = getPathStrokeBufferData(
                path, width, path.closed, indexOffset, lineJoin, lineCap, lineDash, lineDashOffset
            );
            positions = positions.concat(pathData.positions);
            indices = indices.concat(pathData.indices);
        }
        return { positions, indices };
    }
}
