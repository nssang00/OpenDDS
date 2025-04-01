function getPathStrokeBufferData(paths, lineWidth) { const positions = []; const indices = []; const uniqueVertices = new Map(); let indexOffset = 0;

paths.forEach(path => {
    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];

        // 두 점 간 벡터 계산
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = (dy / len) * (lineWidth / 2);
        const ny = (-dx / len) * (lineWidth / 2);

        const vertices = [
            [p1[0] - nx, p1[1] - ny],
            [p1[0] + nx, p1[1] + ny],
            [p2[0] - nx, p2[1] - ny],
            [p2[0] + nx, p2[1] + ny],
        ];

        // 중복 정점 확인 및 저장
        const vIndices = vertices.map(v => {
            const key = `${v[0]},${v[1]}`;
            if (!uniqueVertices.has(key)) {
                uniqueVertices.set(key, positions.length / 2);
                positions.push(v[0], v[1]);
            }
            return uniqueVertices.get(key);
        });

        // 인덱스 추가 (삼각형 두 개로 사각형 구성)
        indices.push(vIndices[0], vIndices[1], vIndices[2]);
        indices.push(vIndices[1], vIndices[2], vIndices[3]);
    }
    indexOffset = positions.length / 2;
});

return { positions: new Float32Array(positions), indices: new Uint16Array(indices) };

}

