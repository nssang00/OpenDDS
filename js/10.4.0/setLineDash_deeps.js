((() => {
    class Path {
        constructor(ctx) {
            this.paths = []
            this.ctx = ctx
        }

        // ... [기존 메서드들 유지] ...

        getStrokeBufferData() {
            let positions = []
            let indices = []
            const width = this.ctx.lineWidth
            const lineJoin = this.ctx.lineJoin
            const lineCap = this.ctx.lineCap
            const lineDash = this.ctx.lineDash
            const lineDashOffset = this.ctx.lineDashOffset
            
            for (const path of this.paths) {
                if (path.length < 2) continue
                const indexOffset = positions.length / 2
                
                // 파선 데이터 생성 여부 결정
                let pathData
                if (lineDash.length > 0) {
                    pathData = getDashedStrokeBufferData(
                        path, 
                        width, 
                        path.closed, 
                        indexOffset, 
                        lineJoin, 
                        lineCap,
                        lineDash,
                        lineDashOffset
                    )
                } else {
                    pathData = getPathStrokeBufferData(
                        path, 
                        width, 
                        path.closed, 
                        indexOffset, 
                        lineJoin, 
                        lineCap
                    )
                }
                
                positions = positions.concat(pathData.positions)
                indices = indices.concat(pathData.indices)
            }
            return {
                positions,
                indices
            }
        }

        // ... [나머지 메서드들 유지] ...
    }

    class WebGL2RenderingContext2D {
        constructor(canvas) {
            // ... [기존 생성자 코드 유지] ...

            // 새로운 속성 추가
            this.lineDash = []
            this.lineDashOffset = 0
        }

        // setLineDash 메서드 구현
        setLineDash(segments) {
            if (!segments) {
                this.lineDash = []
                return
            }
            
            // 빈 배열이면 실선 처리
            if (segments.length === 0) {
                this.lineDash = []
                return
            }
            
            // 홀수 길이 배열 처리 (배열 복사하여 2배로 확장)
            this.lineDash = segments.length % 2 === 0 ? [...segments] : [...segments, ...segments]
        }

        getLineDash() {
            return [...this.lineDash]
        }

        // ... [기존 메서드들 유지] ...
    }

    // 파선 생성 헬퍼 함수 추가
    function getDashedStrokeBufferData(path, width, closed, indexOffset, lineJoin, lineCap, dash, dashOffset) {
        // 경로 데이터를 dash 패턴에 따라 처리
        const dashedPoints = applyLineDashing(path, dash, dashOffset)
        
        // 처리된 점들을 사용하여 스트로크 데이터 생성
        return generateStrokeBufferData(dashedPoints, width, closed, indexOffset, lineJoin, lineCap)
    }

    function applyLineDashing(path, dash, dashOffset) {
        const dashedPoints = []
        let currentDashIndex = 0
        let currentDashLength = dash[0] || 0
        let remaining = currentDashLength
        let isGap = false
        let offset = dashOffset
        
        // 경로의 각 선분을 따라 dash 적용
        for (let i = 0; i < path.length; i++) {
            const start = path[i]
            const end = path[(i + 1) % path.length]
            
            const segmentLength = distance(start, end)
            let segmentOffset = 0
            
            while (segmentOffset < segmentLength) {
                const consume = Math.min(remaining, segmentLength - segmentOffset)
                
                if (!isGap) {
                    const startPoint = interpolate(start, end, segmentOffset / segmentLength)
                    const endPoint = interpolate(start, end, (segmentOffset + consume) / segmentLength)
                    dashedPoints.push(startPoint, endPoint)
                }
                
                segmentOffset += consume
                remaining -= consume
                
                if (remaining <= 0) {
                    currentDashIndex = (currentDashIndex + 1) % dash.length
                    currentDashLength = dash[currentDashIndex]
                    remaining = currentDashLength
                    isGap = !isGap
                }
            }
        }
        
        return dashedPoints
    }

    // 도우미 함수들
    function distance(a, b) {
        return Math.sqrt((b[0] - a[0])**2 + (b[1] - a[1])**2)
    }

    function interpolate(a, b, t) {
        return [
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t
        ]
    }

    // ... [나머지 기존 코드 유지] ...
})());
