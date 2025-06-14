// ====================================================================
// File: src/ol/render/webgl/linestringreplay/defaultshader/linestring.vert
// (GLSL 1.00 – WebGL 1/2 호환, a_vertexNumber 정적 VBO 방식)
// ====================================================================
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

// ───── 정적 코너 VBO ─────
attribute float a_vertexNumber; // 0,1,2,3  (divisor 0)

// ───── 인스턴스 VBO 속성 ─────
attribute vec2  a_segmentStart;
attribute vec2  a_segmentEnd;
attribute float a_measureStart;
attribute float a_measureEnd;
attribute float a_angleStart;      // a_joinAngles.x
attribute float a_angleEnd;        // a_joinAngles.y
attribute float a_angleTangentSum; // 누적 탄젠트 합
attribute float a_distance;
attribute vec4  a_hitColor;
attribute float a_prop_layer;
/* 필요하다면 custom attribute 도 뒤이어 선언 */

// ───── uniform & varying (기존과 동일) ─────
uniform mat4  u_projectionMatrix;   
uniform vec2  u_viewportSizePx;
uniform float u_resolution;
uniform float u_depth;

varying vec2  v_segmentStart;
varying vec2  v_segmentEnd;
varying float v_angleStart;
varying float v_angleEnd;
varying float v_width;
varying vec4  v_hitColor;
varying float v_distanceOffsetPx;
varying float v_measureStart;
varying float v_measureEnd;
varying float v_prop_layer;

// ───── 헬퍼 함수 (기존 코드 그대로) ─────
vec2 worldToPx(vec2 w){vec4 s=u_projectionMatrix*vec4(w,0.,1.);return(.5*s.xy+.5)*u_viewportSizePx;}
vec4 pxToScreen(vec2 p){vec2 s=2.*p/u_viewportSizePx-1.;return vec4(s,u_depth,1.);} 
bool isCap(float a){return a<-0.1;} 
vec2 joinDir(vec2 n,float a){float h=a*.5,c=cos(h),s=sin(h);return vec2(s*n.x+c*n.y,-c*n.x+s*n.y)*(1./s);} 
vec2 offsetPt(vec2 pt,vec2 n,float a,float off){return (cos(a)>0.998||isCap(a))?pt-n*off:pt-joinDir(n,a)*off;}

void main(void){
    // ★ vertexNumber를 정적 VBO에서 직접 읽음
    float vertexNumber = a_vertexNumber;

    // 이전 코드에서 a_angleStart/End와 a_angleTangentSum을 그대로 사용
    v_angleStart = a_angleStart;
    v_angleEnd   = a_angleEnd;

    float lineWidth   = 20.0;
    float lineOffsetPx = 0.0;

    vec2 p0 = worldToPx(a_segmentStart);
    vec2 p1 = worldToPx(a_segmentEnd);
    vec2 tg = normalize(p1 - p0);
    vec2 n  = vec2(-tg.y, tg.x);

    p0 = offsetPt(p0,n,v_angleStart,lineOffsetPx);
    p1 = offsetPt(p1,n,v_angleEnd  ,lineOffsetPx);

    float nDir = (vertexNumber==0.0 || vertexNumber==3.0)? 1.0 : -1.0;
    float tDir = (vertexNumber<2.0)? 1.0 : -1.0;
    float ang  = (vertexNumber<2.0)? v_angleStart : v_angleEnd;
    vec2  join = (cos(ang)>0.985||isCap(ang)) ? n*nDir - tg*tDir : joinDir(n*nDir,ang);

    vec2 posPx = ((vertexNumber<2.0)? p0 : p1) + join*(lineWidth*0.5 + 1.0);
    gl_Position = pxToScreen(posPx);

    v_segmentStart      = p0;
    v_segmentEnd        = p1;
    v_width             = lineWidth;
    v_hitColor          = a_hitColor;
    v_distanceOffsetPx  = a_distance/u_resolution - (lineOffsetPx * a_angleTangentSum);
    v_measureStart      = a_measureStart;
    v_measureEnd        = a_measureEnd;
    v_prop_layer        = a_prop_layer;
}

// ====================================================================
// File: src/ol/render/webgl/linestringreplay/defaultshader/LineStringReplay.js
//   (생략된 부분은 기존 코드 그대로, 변경/추가된 핵심만 발췌)
// ====================================================================

// ───── 1) 정적 VBO & 인덱스 VBO 초기화 (레이어 생성 때 1회) ─────
function initStaticBuffers(gl){
  // 코너 VBO (a_vertexNumber)
  const quadVbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,1,2,3]), gl.STATIC_DRAW);

  // 인덱스 VBO (0 1 2 0 2 3)
  const idxVbo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxVbo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,0,2,3]), gl.STATIC_DRAW);

  return {quadVbo, idxVbo};
}

// ───── 2) VAO 설정 (setUpProgram 등) ─────
function bindAttributes(gl, program, staticBufs, instanceVbo, stride){
  const locVertexNum = gl.getAttribLocation(program, 'a_vertexNumber');
  gl.bindBuffer(gl.ARRAY_BUFFER, staticBufs.quadVbo);
  gl.vertexAttribPointer(locVertexNum, 1, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(locVertexNum); // divisor 0

  // … 기존 인스턴스 속성들 …
  function enableInst(loc, size, type, normalized, stride, offset){
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc,size,type,normalized,stride,offset);
    gl.vertexAttribDivisor(loc,1);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceVbo);
  enableInst(gl.getAttribLocation(program,'a_segmentStart'),2,gl.FLOAT,false,stride,0);
  /* 나머지 인스턴스 속성도 enableInst 호출 */

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, staticBufs.idxVbo);
}

// ───── 3) draw 호출 변경 ─────
function drawReplay(gl, ext, segmentCount){
  if(ext){
    ext.drawElementsInstancedANGLE(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0,segmentCount);
  } else {
    gl.drawElementsInstanced(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0,segmentCount);
  }
}

// ====================================================================
// File: src/ol/render/webgl/linestringreplay/writeLineSegmentToBuffers.js
//   (세그먼트당 1 레코드 push, indexArray 사용 X)
// ====================================================================
export function writeLineSegmentToBuffers(/* 매개변수 동일 */){
  /* … 기존 각종 각도·길이 계산 로직 그대로 … */

  vertexArray.push(
    p0[0], p0[1], m0,
    p1[0], p1[1], m1,
    angle0, angle1,
    currentLength,
    newAngleTangentSum,   // a_angleTangentSum
    ...customAttributes   // hitColor, custom attr 등
  );

  // indexArray 조작 없음 (정적 인덱스 VBO를 사용)

  return { length: currentLength + Math.hypot(p1w[0]-p0w[0], p1w[1]-p0w[1]),
           angle:  newAngleTangentSum };
}

// ====================================================================
// 사용 요령 요약
// --------------------------------------------------------------------
// 1. 레이어 초기화 시 initStaticBuffers(gl) 로 quad & index VBO 생성
// 2. 세그먼트 루프에서 writeLineSegmentToBuffers 로 인스턴스 VBO 작성
// 3. setUpProgram 단계에서 bindAttributes 로 VAO 구성
// 4. drawReplay(gl, ext, segmentCount) 호출 (WebGL1은 ANGLE 확장)
// ====================================================================

