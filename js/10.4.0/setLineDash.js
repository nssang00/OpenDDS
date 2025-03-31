class WebGL2RenderingContext2D {
    constructor(canvas) {
        // 기존 코드 유지
        this._lineDash = []; // 대시 패턴 배열 (예: [5, 5]는 5px 선, 5px 공백)
        this._lineDashOffset = 0; // 대시 오프셋
    }

    // setLineDash 메서드 추가
    setLineDash(segments) {
        if (Array.isArray(segments)) {
            this._lineDash = segments.slice(); // 배열 복사
        } else {
            this._lineDash = [];
        }
    }

    // lineDashOffset 속성에 대한 getter/setter
    set lineDashOffset(offset) {
        this._lineDashOffset = offset || 0;
    }

    get lineDashOffset() {
        return this._lineDashOffset;
    }

    // 기존 stroke 메서드 유지, Path 클래스에서 대시 처리 반영
    stroke() {
        const { positions, indices } = this.path.getStrokeBufferData();
        this._draw(positions, indices, this._strokeStyle);
    }
}


///////////////

class Path {
    constructor(ctx) {
        this.paths = [];
        this.ctx = ctx;
    }

    getStrokeBufferData() {
        let positions = [];
        let indices = [];
        const width = this.ctx.lineWidth;
        const lineJoin = this.ctx.lineJoin;
        const lineCap = this.ctx.lineCap;
        const lineDash = this.ctx._lineDash || []; // 대시 패턴 가져오기
        const lineDashOffset = this.ctx._lineDashOffset || 0; // 오프셋 가져오기

        for (const path of this.paths) {
            if (path.length < 2) continue;
            const indexOffset = positions.length / 2;

            let pathData;
            if (lineDash.length > 0) {
                // 대시 패턴이 있는 경우
                pathData = getDashedPathStrokeBufferData(
                    path,
                    width,
                    path.closed,
                    indexOffset,
                    lineJoin,
                    lineCap,
                    lineDash,
                    lineDashOffset
                );
            } else {
                // 대시 패턴이 없는 경우 기존 로직 사용
                pathData = getPathStrokeBufferData(
                    path,
                    width,
                    path.closed,
                    indexOffset,
                    lineJoin,
                    lineCap
                );
            }

            positions = positions.concat(pathData.positions);
            indices = indices.concat(pathData.indices);
        }
        return {
            positions,
            indices
        };
    }
}

/////////////

function getDashedPathStrokeBufferData(path, width, closed, indexOffset, lineJoin, lineCap, dashArray, dashOffset) {
    let positions = [];
    let indices = [];

    // 대시 패턴의 총 길이 계산
    const dashCycle = dashArray.reduce((sum, val) => sum + val, 0);
    if (dashCycle === 0) return getPathStrokeBufferData(path, width, closed, indexOffset, lineJoin, lineCap); // 대시 없음

    // 경로의 각 세그먼트 처리
    for (let i = 0; i < path.length - (closed ? 0 : 1); i++) {
        const p0 = path[i];
        const p1 = path[(i + 1) % path.length];
        const dx = p1[0] - p0[0];
        const dy = p1[1] - p0[1];
        const segmentLength = Math.sqrt(dx * dx + dy * dy);
        if (segmentLength === 0) continue;

        // 방향 벡터 계산
        const nx = dx / segmentLength;
        const ny = dy / segmentLength;

        // 대시 패턴 적용
        let distance = dashOffset % dashCycle;
        let t = 0;

        while (t < segmentLength) {
            const dashIdx = Math.floor(distance / dashCycle) * dashArray.length + (distance % dashCycle) / dashCycle * dashArray.length;
            const dashLength = dashArray[Math.floor(dashIdx % dashArray.length)];
            const isDash = Math.floor(dashIdx % dashArray.length) % 2 === 0;

            if (isDash) {
                const t0 = t;
                const t1 = Math.min(t + dashLength, segmentLength);
                const x0 = p0[0] + nx * t0;
                const y0 = p0[1] + ny * t0;
                const x1 = p0[0] + nx * t1;
                const y1 = p0[1] + ny * t1;

                // 대시 세그먼트에 대한 버퍼 데이터 생성
                const segmentData = generateLineSegmentBufferData(x0, y0, x1, y1, width, positions.length / 2 + indexOffset, lineCap);
                positions = positions.concat(segmentData.positions);
                indices = indices.concat(segmentData.indices);
            }

            t += dashLength;
            distance += dashLength;
        }
    }

    // 닫힌 경로의 경우 조인 처리 필요
    if (closed && positions.length > 0) {
        // lineJoin에 따라 추가 처리 가능 (예: miter, bevel, round)
    }

    return { positions, indices };
}

// 간단한 선 세그먼트 버퍼 데이터 생성 함수 (예시)
function generateLineSegmentBufferData(x0, y0, x1, y1, width, indexOffset, lineCap) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dy / len * width / 2;
    const ny = -dx / len * width / 2;

    const positions = [
        x0 + nx, y0 + ny,
        x0 - nx, y0 - ny,
        x1 + nx, y1 + ny,
        x1 - nx, y1 - ny
    ];
    const indices = [
        indexOffset, indexOffset + 1, indexOffset + 2,
        indexOffset + 1, indexOffset + 2, indexOffset + 3
    ];

    return { positions, indices };
}
