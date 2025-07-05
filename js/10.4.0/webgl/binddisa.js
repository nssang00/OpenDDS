<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>WebGL Instanced Polyline + Measure Attribute 예제</title>
  <style>
    html,body,canvas {margin:0;width:100vw;height:100vh;display:block;background:#222;}
  </style>
</head>
<body>
<canvas id="glcanvas" width="800" height="600"></canvas>
<script>
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");
const ext = gl.getExtension("ANGLE_instanced_arrays");
if (!ext) throw "ANGLE_instanced_arrays 미지원";

// ==== Shader 예시 ====
const vsSource = `
attribute vec2  a_segmentStart;
attribute vec2  a_segmentEnd;
attribute vec2  a_position;
attribute float a_measureStart;
attribute float a_measureEnd;
uniform mat4  u_projectionMatrix;
varying float v_measureStart;
varying float v_measureEnd;
void main() {
  v_measureStart = a_measureStart;
  v_measureEnd   = a_measureEnd;
  vec2 pos = mix(a_segmentStart, a_segmentEnd, a_position.x);
  gl_Position = u_projectionMatrix * vec4(pos, 0, 1);
}
`;

const fsSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying float v_measureStart;
varying float v_measureEnd;
void main() {
  // measure 값이 0이면 blue, 아니면 yellow로 시각화
  if (v_measureStart != 0.0 || v_measureEnd != 0.0)
    gl_FragColor = vec4(1, 1, 0, 1); // yellow
  else
    gl_FragColor = vec4(0, 0.5, 1, 1); // blue
}
`;

// ==== 컴파일 함수 ====
function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw gl.getShaderInfoLog(shader);
  return shader;
}
function getProgram(vsSource, fsSource) {
  const p = gl.createProgram();
  gl.attachShader(p, compileShader(gl.VERTEX_SHADER, vsSource));
  gl.attachShader(p, compileShader(gl.FRAGMENT_SHADER, fsSource));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw gl.getProgramInfoLog(p);
  return p;
}
const program = getProgram(vsSource, fsSource);
gl.useProgram(program);

// ==== Attribute 바인딩 유틸 ====
function bindAttrib(name, size, stride, offset, divisor) {
  const loc = gl.getAttribLocation(program, name);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset);
  ext.vertexAttribDivisorANGLE(loc, divisor);
}
function disableAttrib(name, value = 0) {
  const loc = gl.getAttribLocation(program, name);
  gl.disableVertexAttribArray(loc);
  gl.vertexAttrib1f(loc, value);
}
function bindMeasureAttribsInterleaved(needMeasure, measureData) {
  if (!needMeasure) {
    disableAttrib("a_measureStart", 0);
    disableAttrib("a_measureEnd", 0);
  } else {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, measureData, gl.STATIC_DRAW);
    bindAttrib("a_measureStart", 1, 8, 0, 1);
    bindAttrib("a_measureEnd",   1, 8, 4, 1);
  }
}

// ==== 예제 geometry ====
const coords = [
  [0.1, 0.1],
  [0.8, 0.2],
  [0.7, 0.9],
  [0.2, 0.8],
];

// (A) 인스턴스 데이터 (segment, position)
const instanceCount = coords.length - 1;
const instanceData = [];
for (let i = 0; i < instanceCount; ++i) {
  // [a_segmentStart(xy), a_segmentEnd(xy)]
  instanceData.push(
    coords[i][0], coords[i][1],
    coords[i+1][0], coords[i+1][1]
  );
}
const instanceBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instanceData), gl.STATIC_DRAW);

// (B) 정점 쿼드 (a_position)
const quadVertices = new Float32Array([0,0, 0,1, 1,0, 1,1]);
const quadBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

// ==== measure buffer 예시 ====
function makeMeasureData(need) {
  // interleaved [start0, end0, start1, end1, ...]
  const arr = new Float32Array(instanceCount * 2);
  if (need) {
    arr[2] = 1.5;   // 3번째 segment의 start만 값 할당(테스트용)
    arr[3] = 2.5;   // 3번째 segment의 end만 값 할당(테스트용)
  }
  // 나머지는 0 (기본)
  return arr;
}

// ==== Projection matrix ====
function orthoMat2d(left, right, bottom, top) {
  return new Float32Array([
    2/(right-left), 0, 0, 0,
    0, 2/(top-bottom), 0, 0,
    0, 0, 1, 0,
    -(right+left)/(right-left), -(top+bottom)/(top-bottom), 0, 1
  ]);
}
const proj = orthoMat2d(0, 1, 0, 1);
const u_proj = gl.getUniformLocation(program, "u_projectionMatrix");
gl.uniformMatrix4fv(u_proj, false, proj);

// ==== Draw ====
function draw(needMeasure) {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);

  // (1) 쿼드 vertex (정점 buffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  bindAttrib("a_position", 2, 0, 0, 0); // vertex attribute (not instanced)

  // (2) 인스턴스 buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
  bindAttrib("a_segmentStart", 2, 16, 0, 1); // stride 16 bytes, offset 0, divisor 1
  bindAttrib("a_segmentEnd",   2, 16, 8, 1); // stride 16 bytes, offset 8, divisor 1

  // (3) measure buffer
  const measureData = makeMeasureData(needMeasure);
  bindMeasureAttribsInterleaved(needMeasure, measureData);

  // (4) Draw: 4개 쿼드 정점, instanceCount만큼
  ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, instanceCount);
}

// === 이벤트: 버튼으로 measure attribute 토글 ===
let needMeasure = false;
window.addEventListener("keydown", (e)=>{
  if (e.key === 'm') {
    needMeasure = !needMeasure;
    draw(needMeasure);
  }
});

// === 최초 draw ===
draw(false);

// === 안내 텍스트 ===
const info = document.createElement('div');
info.textContent = '[M] 키로 measure attribute 토글 (노란색=값 있음, 파란색=없음)';
info.style.cssText = 'position:fixed;left:12px;top:12px;color:#fff;font:16px Pretendard,sans-serif;z-index:10';
document.body.appendChild(info);
</script>
</body>
</html>
