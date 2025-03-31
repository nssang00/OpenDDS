//const { Vector2, Matrix4 } = THREE

class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(v, w) {
        if (w !== undefined) {
            console.warn('THREE.Vector2: .add() now only accepts one argument. Use .addVectors( a, b ) instead.');
            return this.addVectors(v, w);
        }

        this.x += v.x;
        this.y += v.y;
        return this;
    }

    addVectors(a, b) {
        this.x = a.x + b.x;
        this.y = a.y + b.y;
        return this;
    }

    sub(v, w) {
        if (w !== undefined) {
            console.warn('THREE.Vector2: .sub() now only accepts one argument. Use .subVectors( a, b ) instead.');
            return this.subVectors(v, w);
        }

        this.x -= v.x;
        this.y -= v.y;
        return this;
    }


    multiplyScalar(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    divideScalar(scalar) {
        return this.multiplyScalar(1 / scalar);
    }

    negate() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    manhattanLength() {
        return Math.abs(this.x) + Math.abs(this.y);
    }

    normalize() {
        return this.divideScalar(this.length() || 1);
    }


    fromArray(array, offset = 0) {
        this.x = array[offset];
        this.y = array[offset + 1];
        return this;
    }

    toArray(array = [], offset = 0) {
        array[offset] = this.x;
        array[offset + 1] = this.y;
        return array;
    }

}

function getVector2Normal(vec1, vec2) {
    const vec = new Vector2().add(vec2).sub(vec1)
    return new Vector2(-vec.y, vec.x).normalize()
}

function normalize(vec) {
    const len = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1])
    return [vec[0] / len, vec[1] / len]
}
/*
function mat4Multiply(mat1, mat2) {
    const m1 = new Matrix4().fromArray(mat1)
    const m2 = new Matrix4().fromArray(mat2)
    return m1.multiply(m2).elements
}*/


function computeNormalAndLength(points) {
    if (!points || points.lengths < 2) {
        return {
            points,
            miterNormals: null,
            lengths: null,
            normal: null
        }
    }

    const N = points.length
    const miterNormals = Array(N).fill().map(() => [0, 0])
    const lengths = Array(N).fill(1)

    const normals = []
    for (let i = 0; i < N - 1; i++) {
        normals.push(getVector2Normal(new Vector2(points[i][0], points[i][1]), new Vector2(points[i + 1][0], points[i + 1][1])))
    }
    normals.push(getVector2Normal(new Vector2(points[N - 1][0], points[N - 1][1]), new Vector2(points[0][0], points[0][1])))

    for (let i = 0; i < N; i++) {
        const va = normals[(i - 1 + N) % N]
        const vb = normals[i % N]
        const normal = new Vector2().addVectors(va, vb).normalize()

        const edgeDir = new Vector2(points[(i + 1) % N][0] - points[i][0], points[(i + 1) % N][1] - points[i][1])
        // keep mitter normal's direction outside
        if (normal.dot(edgeDir) > 0) {
            normal.negate()
        }
        lengths[i] = 1 / normal.dot(va)
        miterNormals[i] = normal.toArray()
    }

    return {
        points,
        miterNormals, // mitter normals
        lengths,
        normals: normals.map(n => n.toArray())
    }
}

function getPathStrokeBufferData(path, width, isClosed, indexOffset, lineJoin, lineCap) {
    const result = computeNormalAndLength(path)

    const positions = []
    const indices = []

    if (!isClosed) {
        // begin Node
        // TODO: consider linecap
        const [x, y] = result.points[0]
        const [nx, ny] = result.normals[0]

        if (lineCap === 'square') {
            const [dirX, dirY] = normalize([result.points[1][0] - result.points[0][0], result.points[1][1] - result.points[0][1]])
            positions.push(x - dirX * width / 2 + nx * width / 2, y - dirY * width / 2 + ny * width / 2, x - dirX * width / 2 - nx * width / 2, y - dirY * width / 2 - ny * width / 2)
        } else if (lineCap === 'round') {
            const startAngle = Math.atan2(-ny, -nx)
            const endAngle = Math.atan2(ny, nx)
            const arcPath = createArc(x, y, width / 2, startAngle, endAngle, 30, true)
            for (const [px, py] of arcPath) {
                positions.push(px, py, x, y)
            }
        }

        positions.push(x + nx * width / 2, y + ny * width / 2, x - nx * width / 2, y - ny * width / 2)
    }

    // don't need to consider first and last point if not isClosed
    const lineJoinRange = isClosed ? { left: 0, right: result.points.length - 1 } : { left: 1, right: result.points.length - 2 }

    for (let i = lineJoinRange.left; i <= lineJoinRange.right; i++) {
        const [x, y] = result.points[i]
        const [nx, ny] = result.miterNormals[i]
        const l = result.lengths[i]
        if (lineJoin === 'bevel' | lineJoin === 'round') {
            let [rawNormal1x, rawNormal1y] = result.normals[(i + result.normals.length - 1) % result.normals.length]
            let [rawNormal2x, rawNormal2y] = result.normals[i]
            // NOTE: caution the draw order
            if (l < 0) {
                positions.push(x + nx * l * width / 2, y + ny * l * width / 2, x - rawNormal1x * width / 2, y - rawNormal1y * width / 2)

                // for round join
                const startAngle = Math.atan2(-rawNormal1y, -rawNormal1x)
                const endAngle = Math.atan2(-rawNormal2y, -rawNormal2x)
                const arcPath = createArc(x, y, width / 2, startAngle, endAngle, 30, false)
                for (const [px, py] of arcPath) {
                    positions.push(x, y, px, py)
                }

                positions.push(x + nx * l * width / 2, y + ny * l * width / 2, x - rawNormal2x * width / 2, y - rawNormal2y * width / 2,)
            } else {
                positions.push(x + rawNormal1x * width / 2, y + rawNormal1y * width / 2, x - nx * l * width / 2, y - ny * l * width / 2)

                // for round join
                const startAngle = Math.atan2(rawNormal1y, rawNormal1x)
                const endAngle = Math.atan2(rawNormal2y, rawNormal2x)
                const arcPath = createArc(x, y, width / 2, startAngle, endAngle, 30, true)
                for (const [px, py] of arcPath) {
                    positions.push(px, py, x, y)
                }

                positions.push(x + rawNormal2x * width / 2, y + rawNormal2y * width / 2, x - nx * l * width / 2, y - ny * l * width / 2)
            }
        } else {
            positions.push(x + nx * l * width / 2, y + ny * l * width / 2, x - nx * l * width / 2, y - ny * l * width / 2)
        }
    }

    if (!isClosed) {
        // end Node
        // TODO: consider linecap
        const idx = result.points.length - 1
        const [x, y] = result.points[idx]
        const [nx, ny] = result.normals[idx - 1] // NOTE: not use current normal, because this is the normal of edge between last point and first point. use previous instead

        positions.push(x + nx * width / 2, y + ny * width / 2, x - nx * width / 2, y - ny * width / 2)

        if (lineCap === 'square') {
            const [dirX, dirY] = normalize([result.points[idx][0] - result.points[idx - 1][0], result.points[idx][1] - result.points[idx - 1][1]])
            positions.push(x + dirX * width / 2 + nx * width / 2, y + dirY * width / 2 + ny * width / 2, x + dirX * width / 2 - nx * width / 2, y + dirY * width / 2 - ny * width / 2)
        } else if (lineCap === 'round') {
            const startAngle = Math.atan2(-ny, -nx)
            const endAngle = Math.atan2(ny, nx)
            const arcPath = createArc(x, y, width / 2, startAngle, endAngle, 30, false)
            for (const [px, py] of arcPath) {
                positions.push(px, py, x, y)
            }
        }

    }

    for (let i = 0; i < (positions.length / 4 - 1); i++) { // divide by 4: get half num of nodes; minus 1, prevent tail if not closed
        indices.push(indexOffset + 2 * i, indexOffset + 2 * i + 1, indexOffset + 2 * i + 2)
        indices.push(indexOffset + 2 * i + 1, indexOffset + 2 * i + 3, indexOffset + 2 * i + 2)
    }

    if (isClosed) {
        indices.push(indexOffset + positions.length / 2 - 2, indexOffset + positions.length / 2 - 1, indexOffset)
        indices.push(indexOffset + positions.length / 2 - 1, indexOffset + 1, indexOffset)
    }

    return {
        positions,
        indices
    }
}

const COLOR_TABLE = {
    'transparent': [0, 0, 0, 0],
    'black': [0, 0, 0, 1],
    'white': [255, 255, 255, 1],
    'red': [255, 0, 0, 1],
    'green': [0, 128, 0, 1],
    'blue': [0, 0, 255, 1],
    'yellow': [255, 255, 0, 1],
    'purple': [128, 0, 128, 1],
    'cyan': [0, 255, 255, 1],
}

function colorParser(color) {
    if (color in COLOR_TABLE) {
        const [r, g, b, a] = COLOR_TABLE[color]
        return {
            r: r / 255,
            g: g / 255,
            b: b / 255,
            a: a
        }
    }
    // TODO: support all color type
    console.error('Not supported color yet.')
}

function createArc(x, y, radius, startAngle, endAngle, segments = 30, anticlockwise = false) {
    startAngle %= 2 * Math.PI
    endAngle %= 2 * Math.PI

    const path = []
    const epsilon = 0.0001

    if (!anticlockwise) {
        if (endAngle <= startAngle) {
            endAngle += 2 * Math.PI
        }
        for (let angle = startAngle; angle <= endAngle + epsilon; angle += (endAngle - startAngle) / segments) {
            const px = x + radius * Math.cos(angle)
            const py = y + radius * Math.sin(angle)
            path.push([px, py])
        }
    } else {
        if (startAngle <= endAngle) {
            startAngle += 2 * Math.PI
        }
        for (let angle = startAngle; angle >= endAngle - epsilon; angle += (endAngle - startAngle) / segments) {
            const px = x + radius * Math.cos(angle)
            const py = y + radius * Math.sin(angle)
            path.push([px, py])
        }
    }

    return path
}


((() => {
    class Path {
        constructor(ctx) {
            this.paths = []
            this.ctx = ctx
        }

        moveTo(x, y) {
            this.paths.push([[x, y]])
        }

        lineTo(x, y) {
            const last = this.paths.length - 1
            if (this.paths[last].closed) {
                // path closed at start point
                const prevPoint = this.paths[last][0].slice()
                this.paths.push([prevPoint, [x, y]])
            } else {
                this.paths[last].push([x, y])
            }
        }

        getStrokeBufferData() {
            let positions = []
            let indices = []
            const width = this.ctx.lineWidth
            const lineJoin = this.ctx.lineJoin
            const lineCap = this.ctx.lineCap
            for (const path of this.paths) {
                if (path.length < 2) continue
                const indexOffset = positions.length / 2 // index offset when combine all path's position and index, divided by 2: 2 term (x, y) mapping to 1 index
                const pathData = getPathStrokeBufferData(path, width, path.closed, indexOffset, lineJoin, lineCap)
                positions = positions.concat(pathData.positions)
                indices = indices.concat(pathData.indices)
            }
            return {
                positions,
                indices
            }
        }

    }

    class ImageData {
        constructor(width, height, data) {
            this.width = width
            this.height = height
            this.data = data

            if (!this.data) {
                this.data = new Uint8Array(width * height * 4)
            }
        }
    }

    class WebGL2RenderingContext2D {
        constructor(canvas) {
            this._renderer = new Renderer(canvas)

            this._width = canvas.width
            this._height = canvas.height

            this._zIdx = 0 // NOTE: z offset of geometry, due to three's geometry limitation, not need when using pure WebGL

            this._path = null

            /*
            consider WebGL's uniforms
            4d, column major
            [
                a, b, 0, 0,
                c, d, 0, 0,
                0, 0, 1, 0,
                e, f, 0, 1,
            ]
            */
            this._transform = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ]

            this._stateStack = []

            // public attributes
            this.canvas = canvas

            this.lineWidth = 1
            this.lineJoin = 'miter'
            this.lineCap = 'butt'

            this._strokeStyle = { r: 0, g: 0, b: 0, a: 1 } // setter&getter
            this._fillStyle = { r: 0, g: 0, b: 0, a: 1 } // setter&getter
        }

        _draw(positions, indices, fillStyle) {
            if (fillStyle instanceof CanvasGradient) {
                // TODO: maybe not work with transform?
                const texCoords = positions.map((v, i) => {
                    return i % 2 == 0 ? v / this._width : v / this._height
                })
                // const imageData = this._createGradientImageData(fillStyle, this._width, this._height)
                const imageData = fillStyle.imageData(this._width, this._height)
                this._renderer.drawTexture(
                    positions,
                    indices,
                    texCoords,
                    createTextureFromUint8Array(this._renderer.gl, imageData.data, this._renderer.gl.RGBA, this._width, this._height)
                )
            } else {
                this._renderer.draw(positions, indices, [fillStyle.r, fillStyle.g, fillStyle.b, fillStyle.a])
            }
        }

        // API
        beginPath() {
            this.path = new Path(this)
        }

        closePath() {
            this.path.closePath()
        }

        moveTo(x, y) {
            // TODO: consider call moveTo without beginPath
            this.path.moveTo(x, y)
        }

        lineTo(x, y) {
            this.path.lineTo(x, y)
        }

        stroke() {
            const { positions, indices } = this.path.getStrokeBufferData()
            this._draw(positions, indices, this._strokeStyle)
        }

        stroke2(paths, width, lineJoin, lineCap) {
            let positions = []
            let indices = []

            for (const path of paths) {
                if (path.length < 2) continue
                const indexOffset = positions.length / 2 // index offset when combine all path's position and index, divided by 2: 2 term (x, y) mapping to 1 index
                const pathData = getPathStrokeBufferData(path, width, path.closed, indexOffset, lineJoin, lineCap)
                positions = positions.concat(pathData.positions)
                indices = indices.concat(pathData.indices)
            }
            this._draw(positions, indices, this._strokeStyle)
        }
/*
        // Transformations
        transform(a, b, c, d, e, f) {
            const newMat = [
                a, b, 0, 0,
                c, d, 0, 0,
                0, 0, 1, 0,
                e, f, 0, 1
            ]
            // NOTE: post-multiply!!
            // it's not directly transform shapes, it's canvas!
            this._transform = mat4Multiply(this._transform, newMat)
            this._renderer.setTransform(this._transform)
        }


        setTransform(a, b, c, d, e, f) {
            this._transform = [
                a, b, 0, 0,
                c, d, 0, 0,
                0, 0, 1, 0,
                e, f, 0, 1
            ]
            this._renderer.setTransform(this._transform)
        }

        translate(x, y) {
            this.transform(1, 0, 0, 1, x, y)
        }

        rotate(angle) {
            this.transform(
                Math.cos(angle),
                Math.sin(angle),
                -Math.sin(angle),
                Math.cos(angle),
                0,
                0
            )
        }

        scale(x, y) {
            this.transform(x, 0, 0, y, 0, 0)
        }

*/
        drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
            if (arguments.length === 3) {
                this._renderer.drawImage(image, 0, 0, image.width, image.height, sx, sy, image.width, image.height)
            } else if (arguments.length === 5) {
                this._renderer.drawImage(image, 0, 0, image.width, image.height, sx, sy, sWidth, sHeight)
            } else if (arguments.length === 9) {
                this._renderer.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
            } else {
                throw new Error('Invalid parameters')
            }
        }

        // pixel manipulation

        getImageData(sx, sy, sw, sh) {
            return this._renderer.getImageData(sx, sy, sw, sh)
        }

        putImageData(imageData, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight) {
            this._renderer.putImageData(imageData, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight)
        }

        createImageData(width, height) {
            if (arguments.length === 1) {
                const imageData = width
                width = imageData.width
                height = imagedata.height
            }
            return {
                width,
                height,
                data: new Uint8ClampedArray(width * height * 4)
            }
        }

        set strokeStyle(style) {
            if (style instanceof CanvasGradient) {
                this._strokeStyle = style
            } else {
                this._strokeStyle = colorParser(style)
            }
        }

        get strokeStyle() {
            // TODO: format
            return this._strokeStyle
        }
    }

    // mixin getContext
    const originGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (contextType) {
        if (contextType === 'webgl2-2d') {
            return new WebGL2RenderingContext2D(this) // TODO: consider arguments
        } else {
            return originGetContext.apply(this, arguments) // TODO: ..
        }
    }
})()) // TODO: more proper way