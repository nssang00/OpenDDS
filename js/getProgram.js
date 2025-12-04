useProgram(program) {
    if (this.currentProgram !== program) {
        // 1. WebGL 상태 변경
        gl.useProgram(program);
        this.currentProgram = program;

        // 2. 해당 프로그램의 캐시를 로드 또는 초기화
        if (this._programCaches.has(program)) {
            // 기존 캐시가 있으면 로드
            this._currentCache = this._programCaches.get(program);
        } else {
            // 새 프로그램이면 새 캐시를 생성하고 저장
            this._currentCache = {};
            this._programCaches.set(program, this._currentCache);
        }
        return true;
    }
    return false;
}
///////////
function fnv1a(str) {
  // FNV-1a 32bit
  let hash = 0x811c9dc5; // offset basis

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0; // FNV prime 16777619
  }

  return hash.toString(16);
}


getProgram(fragmentShaderSource, vertexShaderSource) {
  const gl = this.gl_;

  if (!gl.programCache) {
    gl.programCache = new Map();
  }

  const cacheKey = fnv1a(fragmentShaderSource + '\u0000' + vertexShaderSource);

  if (gl.programCache.has(cacheKey)) {
      return gl.programCache.get(cacheKey);
  }

  // ===== 여기부터는 기존 컴파일/링크 코드 =====
  const fragmentShader = this.compileShader(
    fragmentShaderSource,
    gl.FRAGMENT_SHADER,
  );

  const vertexShader = this.compileShader(
    vertexShaderSource,
    gl.VERTEX_SHADER,
  );

  const program = gl.createProgram();
  gl.attachShader(program, fragmentShader);
  gl.attachShader(program, vertexShader);
  gl.linkProgram(program);

  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    const message = `Fragment shader compilation failed: ${gl.getShaderInfoLog(
      fragmentShader,
    )}`;
    gl.deleteShader(fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteProgram(program);
    throw new Error(message);
  }
  gl.deleteShader(fragmentShader);

  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    const message = `Vertex shader compilation failed: ${gl.getShaderInfoLog(
      vertexShader,
    )}`;
    gl.deleteShader(vertexShader);
    gl.deleteProgram(program);
    throw new Error(message);
  }
  gl.deleteShader(vertexShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = `GL program linking failed: ${gl.getProgramInfoLog(
      program,
    )}`;
    gl.deleteProgram(program);
    throw new Error(message);
  }

  // 성공하면 캐시에 저장
  gl._programCache.set(key, program);
  return program;
}
