function resetDrawState(gl, disableAlphaBlend, enableDepth) {
  // color 채널 복구 (🔥 red 문제 핵심)
  gl.colorMask(true, true, true, true);

  gl.enable(gl.BLEND);
  gl.blendFunc(
    gl.ONE,
    disableAlphaBlend ? gl.ZERO : gl.ONE_MINUS_SRC_ALPHA
  );

  if (enableDepth) {
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
  } else {
    gl.disable(gl.DEPTH_TEST);
  }
}



const isSameStructure = (arr1, arr2) => 
  arr1.every((obj, i) => 
    JSON.stringify(Object.keys(obj).sort()) === 
    JSON.stringify(Object.keys(arr2[i]).sort())
  );

prepareFrame() {
  // 새 함수 사용
  this.helper.setUniformMatrixValue(
    Uniforms.PROJECTION_MATRIX,
    mat4FromTransform2D(this.tmpMat4_, this.currentFrameStateTransform_)
  );
  
  // screen to world
  makeInverseTransform(this.tmpTransform_, this.currentFrameStateTransform_);
  this.helper.setUniformMatrixValue(
    Uniforms.SCREEN_TO_WORLD_MATRIX,
    mat4FromTransform2D(this.tmpMat4_, this.tmpTransform_)
  );
}

applyUniforms_(alpha, renderExtent, batchInvertTransform, tileZ, depth) {
  // batchInvertTransform 그대로 사용
  this.helper.setUniformFloatVec2(
    Uniforms.TILE_ORIGIN,
    [batchInvertTransform[4], batchInvertTransform[5]]
  );
  
  this.helper.setUniformFloatValue(Uniforms.GLOBAL_ALPHA, alpha);
  this.helper.setUniformFloatValue(Uniforms.DEPTH, depth);
  this.helper.setUniformFloatValue(Uniforms.TILE_ZOOM_LEVEL, tileZ);
  this.helper.setUniformFloatVec4(Uniforms.RENDER_EXTENT, renderExtent);
}

/////////////
this.applyUniforms.call(
  { ...this, uniforms_: customUniforms },
  frameState
);

applyUniforms(
  frameState,
  Object.entries(uniforms).map(([name, value]) => ({ name, value }))
);



prepareFrame() {
  // 기본 projection만 설정 (한 번)
  this.helper.setUniformMatrixValue(
    Uniforms.PROJECTION_MATRIX,
    mat4FromTransform(this.tmpMat4_, this.currentFrameStateTransform_)
  );
  
  // screen to world도 한 번만
  makeInverseTransform(this.tmpTransform_, this.currentFrameStateTransform_);
  this.helper.setUniformMatrixValue(
    Uniforms.SCREEN_TO_WORLD_MATRIX,
    mat4FromTransform(this.tmpMat4_, this.tmpTransform_),
  );
}

applyUniforms_(alpha, renderExtent, batchInvertTransform, tileZ, depth) {
  // 타일 origin(월드 좌표의 타일 원점) 추출
  this.helper.setUniformFloatVec2(
    Uniforms.TILE_ORIGIN,
    [batchInvertTransform[4], batchInvertTransform[5]]
  );
  
  // 기존에 프레임마다 합쳤던 전체 매트릭스 업데이트 제거(이미 제거됨)
  
  // 나머지 uniform들
  this.helper.setUniformFloatValue(Uniforms.GLOBAL_ALPHA, alpha);
  this.helper.setUniformFloatValue(Uniforms.DEPTH, depth);
  this.helper.setUniformFloatValue(Uniforms.TILE_ZOOM_LEVEL, tileZ);
  this.helper.setUniformFloatVec4(Uniforms.RENDER_EXTENT, renderExtent);
}
/////
// Vertex Shader
uniform vec2 u_tileOrigin;  // 이름 변경


vec2 worldToPx(vec2 localPos) {
  vec2 worldPos = localPos + u_tileOrigin;
  vec4 screenPos = u_projectionMatrix * vec4(worldPos, 0.0, 1.0);
  return (0.5 * screenPos.xy + 0.5) * u_viewportSizePx;
}


//////////////////
bindTexture(texture, slot, uniformName) {
    const gl = this.gl_;
    gl.activeTexture(gl.TEXTURE0 + slot);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.getUniformLocation(uniformName), slot);
  }

applyUniforms(frameState) {
  const gl = this.gl_;

  let value;
  let textureSlot = 0;
  
  this.uniforms_.forEach((uniform) => {
    value =
      typeof uniform.value === 'function'
        ? uniform.value(frameState)
        : uniform.value;
    
    if (
      value instanceof HTMLCanvasElement ||
      value instanceof HTMLImageElement ||
      value instanceof ImageData ||
      value instanceof WebGLTexture
    ) {
      if (value instanceof WebGLTexture) {
        if (uniform.texture !== value) {
          uniform.prevValue = undefined;
          uniform.texture = value;
          uniform.textureInitialized = false; // 새 텍스처이니 파라미터 다시 세팅
        }
      } else if (!uniform.texture) {
        // 처음 non-WebGLTexture를 사용하는 경우에만 텍스처 생성
        uniform.prevValue = undefined;
        uniform.texture = gl.createTexture();
        uniform.textureInitialized = false; // 새 텍스처 → 파라미터 세팅 필요
      }

      this.bindTexture(uniform.texture, textureSlot, uniform.name);
      
      if (!uniform.textureInitialized) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        uniform.textureInitialized = true;
      }

      const imageReady =
        !(value instanceof HTMLImageElement) ||
        /** @type {HTMLImageElement} */ (value).complete;

      if (
        !(value instanceof WebGLTexture) &&
        imageReady &&
        uniform.prevValue !== value
      ) {
        uniform.prevValue = value;
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          value,
        );
      }
      textureSlot++;
    } else if (Array.isArray(value)) {
      const len = value.length;
      if (len === 6) {
        this.setUniformMatrixValue(
          uniform.name,
          fromTransform(this.tmpMat4_, value),
        );
      } else if (len <= 4) {
        const location = this.getUniformLocation(uniform.name);
        if (len === 2) {
          gl.uniform2f(location, value[0], value[1]);
        } else if (len === 3) {
          gl.uniform3f(location, value[0], value[1], value[2]);
        } else if (len === 4) {
          gl.uniform4f(location, value[0], value[1], value[2], value[3]);
        }
      }
    } else if (typeof value === 'number') {
      gl.uniform1f(this.getUniformLocation(uniform.name), value);
    }
  });
}


/////////////
// 1. WebGL 컨텍스트
const canvas = document.querySelector('#glcanvas');
const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
if (!gl) throw new Error('WebGL not supported');

// 2. 간단한 쉐이더 프로그램 2개 생성 (헬퍼 함수 생략, 직접 작성)
function createProgram(vsSource, fsSource) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vsSource);
  gl.compileShader(vs);

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fsSource);
  gl.compileShader(fs);

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  return prog;
}

const commonVS = `
  attribute vec2 a_position;
  uniform vec2 u_resolution;
  varying vec2 v_texcoord;
  void main() {
    vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clip * vec2(1, -1), 0, 1);
    v_texcoord = a_position / u_resolution;
  }
`;

const programA = createProgram(commonVS, `
  precision mediump float;
  uniform sampler2D u_tex;
  varying vec2 v_texcoord;
  void main() {
    gl_FragColor = texture2D(u_tex, v_texcoord);          // 원본 이미지
  }
`);

const programB = createProgram(commonVS, `
  precision mediump float;
  uniform sampler2D u_tex;
  varying vec2 v_texcoord;
  void main() {
    vec4 c = texture2D(u_tex, v_texcoord);
    gl_FragColor = vec4(1.0 - c.rgb, c.a);                // 반전 효과
  }
`);

// 3. 풀스크린 쿼드 버퍼 (한 번만 설정)
const quadBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  0, 0,
  canvas.width, 0,
  0, canvas.height,
  canvas.width, canvas.height
]), gl.STATIC_DRAW);

// 4. 텍스처 캐시
const textureCache = new Map(); // url → WebGLTexture

async function loadTexture(url) {
  if (textureCache.has(url)) return textureCache.get(url);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error('Image load failed'));
  });

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);               // 업로드용 임시 바인딩
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

  textureCache.set(url, tex);
  return tex;
}

// 5. 간단한 재활용 렌더 함수 (requestAnimationFrame 없이 직접 호출)
async function drawWithProgram(program, textureUrl) {
  // 텍스처 가져오기 (캐시 사용)
  const texture = await loadTexture(textureUrl);

  // 항상 TEXTURE0에 바인딩 (가장 안전하고 간단)
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.useProgram(program);

  // attribute
  const posLoc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(posLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  // uniforms
  gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height);
  gl.uniform1i(gl.getUniformLocation(program, 'u_tex'), 0);  // 항상 0번 슬롯

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// 6. 사용 예시: 버튼 클릭이나 콘솔에서 직접 호출하며 재활용
// 예: 아래처럼 순서대로 호출하면 programA → B → A 로 번갈아 보입니다.

async function demo() {
  await drawWithProgram(programA, 'https://example.com/image1.jpg');  // A (원본)
  await new Promise(r => setTimeout(r, 1000)); // 1초 대기 (애니메이션 대신)

  await drawWithProgram(programB, 'https://example.com/image2.jpg');  // B (반전)
  await new Promise(r => setTimeout(r, 1000));

  await drawWithProgram(programA, 'https://example.com/image1.jpg');  // 다시 A (원본)
  // 필요하면 계속 반복 호출 가능
}

demo();  // 실행
///////////**

function setUniform(gl, program, uniformName, value) {
  const location = gl.getUniformLocation(program, uniformName);
  
  if (!location) {
    console.warn(`Uniform "${uniformName}"을 찾을 수 없습니다.`);
    return;
  }

  const arr = Array.isArray(value) ? value : [value];
  const size = arr.length;

  switch (size) {
    case 1:
      gl.uniform1f(location, arr[0]);
      break;
    case 2:
      gl.uniform2f(location, arr[0], arr[1]);
      break;
    case 3:
      gl.uniform3f(location, arr[0], arr[1], arr[2]);
      break;
    case 4:
      gl.uniform4f(location, arr[0], arr[1], arr[2], arr[3]);
      break;
    case 16:
      gl.uniformMatrix4fv(location, false, arr);
      break;
    default:
      console.error(`지원하지 않는 배열 크기입니다: ${size}`);
  }
}


/////////////
prepareFrame() {
  // base projection만 설정 (타일 변환 제외)
  this.helper.setUniformMatrixValue(
    Uniforms.PROJECTION_MATRIX,
    mat4FromTransform(this.tmpMat4_, this.currentFrameStateTransform_)
  );
  
  // screen to world
  makeInverseTransform(this.tmpTransform_, this.currentFrameStateTransform_);
  this.helper.setUniformMatrixValue(
    Uniforms.SCREEN_TO_WORLD_MATRIX,
    mat4FromTransform(this.tmpMat4_, this.tmpTransform_),
  );
}

applyUniforms_(alpha, renderExtent, batchInvertTransform, tileZ, depth) {
  // batchInvertTransform의 역변환으로 타일 원점 추출
  makeInverseTransform(this.tmpTransform_, batchInvertTransform);
  
  this.helper.setUniformFloatVec2(
    Uniforms.TILE_ORIGIN,
    [this.tmpTransform_[4], this.tmpTransform_[5]]
  );
  
  this.helper.setUniformFloatValue(Uniforms.GLOBAL_ALPHA, alpha);
  this.helper.setUniformFloatValue(Uniforms.DEPTH, depth);
  this.helper.setUniformFloatValue(Uniforms.TILE_ZOOM_LEVEL, tileZ);
  this.helper.setUniformFloatVec4(Uniforms.RENDER_EXTENT, renderExtent);
}

