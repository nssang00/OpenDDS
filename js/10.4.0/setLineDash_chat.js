class WebGL2RenderingContext2D { constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext("webgl2"); this.paths = []; this.lineWidth = 1; this.lineJoin = "miter"; this.lineCap = "butt"; this.lineDashPattern = []; // 점선 패턴 this.lineDashOffset = 0;  // 점선 오프셋 }

setLineDash(pattern) {
    this.lineDashPattern = pattern;
}

getLineDash() {
    return this.lineDashPattern;
}

setLineDashOffset(offset) {
    this.lineDashOffset = offset;
}

getLineDashOffset() {
    return this.lineDashOffset;
}

getStrokeBufferData() {
    let positions = [];
    let indices = [];
    const width = this.lineWidth;
    const lineJoin = this.lineJoin;
    const lineCap = this.lineCap;
    const dashPattern = this.lineDashPattern;
    const dashOffset = this.lineDashOffset;

    for (const path of this.paths) {
        if (path.length < 2) continue;
        const indexOffset = positions.length / 2;
        const pathData = getPathStrokeBufferData(path, width, path.closed, indexOffset, lineJoin, lineCap, dashPattern, dashOffset);
        positions = positions.concat(pathData.positions);
        indices = indices.concat(pathData.indices);
    }
    return { positions, indices };
}

}

function getPathStrokeBufferData(path, width, closed, indexOffset, lineJoin, lineCap, dashPattern, dashOffset) { 
  let positions = []; 
  let indices = []; 
  let totalLength = 0; 
  let dashIndex = 0; 
  let dashRemaining = dashPattern.length > 0 ? dashPattern[dashIndex] - dashOffset : Infinity;
  let drawSegment = true;

for (let i = 0; i < path.length - 1; i++) {
    let [x1, y1] = path[i];
    let [x2, y2] = path[i + 1];
    let segmentLength = Math.hypot(x2 - x1, y2 - y1);

    while (segmentLength > 0) {
        let step = Math.min(segmentLength, dashRemaining);
        let t = step / segmentLength;
        let xm = x1 + (x2 - x1) * t;
        let ym = y1 + (y2 - y1) * t;

        if (drawSegment) {
            positions.push(x1, y1, xm, ym);
            indices.push(indexOffset++, indexOffset++);
        }

        x1 = xm;
        y1 = ym;
        segmentLength -= step;
        dashRemaining -= step;

        if (dashRemaining <= 0) {
            dashIndex = (dashIndex + 1) % dashPattern.length;
            dashRemaining = dashPattern[dashIndex];
            drawSegment = !drawSegment;
        }
    }
}
return { positions, indices };

}

