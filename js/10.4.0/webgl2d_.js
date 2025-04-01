
function createArc(x, y, radius, startAngle, endAngle, anticlockwise = false) {
    startAngle %= 2 * Math.PI;
    endAngle %= 2 * Math.PI;

    // 세그먼트 수를 radius에 비례하여 동적으로 계산 (최소 4, 최대 16)
    const segments = Math.max(4, Math.min(16, Math.ceil(radius * Math.abs(endAngle - startAngle) / Math.PI)));
    const path = [];
    const epsilon = 0.0001;

    if (!anticlockwise) {
        if (endAngle <= startAngle) endAngle += 2 * Math.PI;
        for (let angle = startAngle; angle <= endAngle + epsilon; angle += (endAngle - startAngle) / segments) {
            path.push([x + radius * Math.cos(angle), y + radius * Math.sin(angle)]);
        }
    } else {
        if (startAngle <= endAngle) startAngle += 2 * Math.PI;
        for (let angle = startAngle; angle >= endAngle - epsilon; angle += (endAngle - startAngle) / segments) {
            path.push([x + radius * Math.cos(angle), y + radius * Math.sin(angle)]);
        }
    }
    return path;
}

function getPathStrokeBufferData(path, width, isClosed, indexOffset, lineJoin, lineCap) {
    const result = computeNormalAndLength(path);
    const positions = [];
    const indices = [];

    if (!isClosed) {
        // 시작점 처리
        const [x, y] = result.points[0];
        const [nx, ny] = result.normals[0];
        if (lineCap === 'square') {
            const [dirX, dirY] = normalize([result.points[1][0] - x, result.points[1][1] - y]);
            positions.push(x - dirX * width / 2 + nx * width / 2, y - dirY * width / 2 + ny * width / 2);
            positions.push(x - dirX * width / 2 - nx * width / 2, y - dirY * width / 2 - ny * width / 2);
        } else if (lineCap === 'round') {
            const startAngle = Math.atan2(-ny, -nx);
            const endAngle = Math.atan2(ny, nx);
            const arcPath = createArc(x, y, width / 2, startAngle, endAngle, true);
            arcPath.forEach(([px, py]) => positions.push(px, py));
        } else { // butt
            positions.push(x + nx * width / 2, y + ny * width / 2);
            positions.push(x - nx * width / 2, y - ny * width / 2);
        }
    }

    const lineJoinRange = isClosed ? { left: 0, right: result.points.length - 1 } : { left: 0, right: result.points.length - 1 };

    for (let i = lineJoinRange.left; i <= lineJoinRange.right; i++) {
        const [x, y] = result.points[i];
        const [nx, ny] = result.miterNormals[i];
        const l = result.lengths[i];

        if (lineJoin === 'bevel' || lineJoin === 'round') {
            const [prevNx, prevNy] = result.normals[(i - 1 + result.normals.length) % result.normals.length];
            const [nextNx, nextNy] = result.normals[i % result.normals.length];

            if (i > 0 || isClosed) {
                positions.push(x + prevNx * width / 2, y + prevNy * width / 2); // 이전 선분의 상단
                positions.push(x - prevNx * width / 2, y - prevNy * width / 2); // 이전 선분의 하단
            }

            if (lineJoin === 'round' && (i > 0 || isClosed)) {
                const startAngle = Math.atan2(prevNy, prevNx);
                const endAngle = Math.atan2(nextNy, nextNx);
                const arcPath = createArc(x, y, width / 2, startAngle, endAngle, l < 0);
                arcPath.forEach(([px, py]) => positions.push(px, py));
            }

            positions.push(x + nextNx * width / 2, y + nextNy * width / 2); // 다음 선분의 상단
            positions.push(x - nextNx * width / 2, y - nextNx * width / 2); // 다음 선분의 하단
        } else { // miter
            positions.push(x + nx * l * width / 2, y + ny * l * width / 2);
            positions.push(x - nx * l * width / 2, y - ny * l * width / 2);
        }
    }

    if (!isClosed) {
        // 끝점 처리
        const idx = result.points.length - 1;
        const [x, y] = result.points[idx];
        const [nx, ny] = result.normals[idx - 1];
        if (lineCap === 'square') {
            const [dirX, dirY] = normalize([x - result.points[idx - 1][0], y - result.points[idx - 1][1]]);
            positions.push(x + dirX * width / 2 + nx * width / 2, y + dirY * width / 2 + ny * width / 2);
            positions.push(x + dirX * width / 2 - nx * width / 2, y + dirY * width / 2 - ny * width / 2);
        } else if (lineCap === 'round') {
            const startAngle = Math.atan2(-ny, -nx);
            const endAngle = Math.atan2(ny, nx);
            const arcPath = createArc(x, y, width / 2, startAngle, endAngle, false);
            arcPath.forEach(([px, py]) => positions.push(px, py));
        } else { // butt
            positions.push(x + nx * width / 2, y + ny * width / 2);
            positions.push(x - nx * width / 2, y - ny * width / 2);
        }
    }

    // 삼각형 스트립으로 인덱스 생성
    const vertexCount = positions.length / 2;
    for (let i = 0; i < vertexCount - 2; i++) {
        indices.push(indexOffset + i, indexOffset + i + 1, indexOffset + i + 2);
    }

    return { positions, indices };
}

// stroke2 함수 수정
function stroke2(paths, width, lineJoin, lineCap) {
    let positions = [];
    let indices = [];

    for (const path of paths) {
        if (path.length < 2) continue;
        const indexOffset = positions.length / 2;
        const pathData = getPathStrokeBufferData(path, width, path.closed, indexOffset, lineJoin, lineCap);
        positions = positions.concat(pathData.positions);
        indices = indices.concat(pathData.indices);
    }
    this._draw(positions, indices, this._strokeStyle);
}
