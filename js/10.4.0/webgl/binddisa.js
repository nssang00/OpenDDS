
const instanceAttributes = [
  { name: "a_segmentStart", size: 2 },
  { name: "a_segmentEnd",   size: 2 }
];
// 예시: 선택적 속성 (measureStart, measureEnd)
const optionalAttributes = [
  { name: "a_measureStart", size: 1 },
  { name: "a_measureEnd",   size: 1 }
];

// ==========================
// 2. Attribute 바인딩 유틸
// ==========================
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
function bindAttributes(attribs, stride, buffer, divisor = 1) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  let offset = 0;
  for (const attr of attribs) {
    bindAttrib(attr.name, attr.size, stride, offset, divisor);
    offset += attr.size * 4;
  }
}

function disableAttributes(attribs, value = 0) {
  for (const attr of attribs) {
    disableAttrib(attr.name, value);
  }
}
function bindOptionalAttributes(useOptional, optionalAttributes, optionalBuffer) {
  const stride = optionalAttributes.reduce((sum, a) => sum + a.size, 0) * 4;
  if (!useOptional) {
    disableAttributes(optionalAttributes, 0);
  } else {
    bindAttributes(optionalAttributes, stride, optionalBuffer, 1);
  }
}



// ==========================
// 5. geometry
// ==========================
const coords = [
  [0.1, 0.1],
  [0.85, 0.15],
  [0.75, 0.88],
  [0.16, 0.84],
];
const instanceCount = coords.length - 1;
const instanceData = [];
for (let i = 0; i < instanceCount; ++i) {
  instanceData.push(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1]);
}
const instanceStride = instanceAttributes.reduce((sum, a) => sum + a.size, 0) * 4;
const instanceBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instanceData), gl.STATIC_DRAW);

const quadVertices = new Float32Array([0,0, 0,1, 1,0, 1,1]);
const quadBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

// ==========================
// 6. optionalAttributes 데이터
// ==========================
function makeOptionalData() {
  const arr = new Float32Array(instanceCount * optionalAttributes.length);
  // 기본값 0, 아래처럼 필요하면 임의로 값 할당 가능
  for (let i = 0; i < instanceCount; ++i) {
    // arr[i*2+0] = 0, arr[i*2+1] = 0 (기본)
  }
  return arr;
}
let optionalData = makeOptionalData();
let optionalBuffer = gl.createBuffer();
function updateOptionalBuffer() {
  gl.bindBuffer(gl.ARRAY_BUFFER, optionalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, optionalData, gl.STATIC_DRAW);
}
updateOptionalBuffer();

// ==========================
// 7. Projection
// ==========================
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

// ==========================
// 8. Draw
// ==========================
let useOptional = false;
function draw() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);

  // 쿼드 vertex
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  bindAttrib("a_position", 2, 0, 0, 0);

  // instance attributes
  bindAttributes(instanceAttributes, instanceStride, instanceBuffer, 1);

  // optional attributes (동적)
  bindOptionalAttributes(useOptional, optionalAttributes, optionalBuffer);

  ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, instanceCount);
}
draw();
