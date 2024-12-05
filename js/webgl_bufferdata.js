<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WebGL BufferSubData Example</title>
</head>
<body>
  <canvas id="canvas" width="800" height="600" style="border:1px solid black;"></canvas>
  <script>
    const canvas = document.getElementById("canvas");
    const gl = canvas.getContext("webgl");

    if (!gl) {
      console.error("WebGL not supported!");
      return;
    }

    // 버퍼 생성 및 초기화
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    // 최대 버퍼 크기 설정 (1024 바이트)
    const maxBufferSize = 1024;
    gl.bufferData(gl.ARRAY_BUFFER, maxBufferSize, gl.DYNAMIC_DRAW);

    // 쉐이더 소스
    const vertexShaderSource = `
      attribute vec2 aPosition;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
        gl_PointSize = 5.0; // 점 크기
      }
    `;
    const fragmentShaderSource = `
      void main() {
        gl_FragColor = vec4(0.0, 0.5, 1.0, 1.0); // 파란색
      }
    `;

    // 쉐이더 컴파일 함수
    function createShader(gl, type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile failed:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    // 프로그램 생성
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link failed:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // 속성 위치
    const positionLocation = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(positionLocation);

    // 버퍼와 속성 연결
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // 가변 데이터 업데이트 및 렌더링
    let offset = 0;

    function updateAndDraw() {
      // 가변 크기 데이터 생성
      const dataSize = Math.floor(Math.random() * 20 + 4); // 4 ~ 24 사이 크기
      const data = new Float32Array(dataSize);
      for (let i = 0; i < dataSize; i++) {
        data[i] = Math.random() * 2 - 1; // -1.0 ~ 1.0
      }

      // 데이터가 최대 크기를 초과하면 offset 초기화
      if (offset + data.byteLength > maxBufferSize) {
        offset = 0;
      }

      // 버퍼 업데이트
      gl.bufferSubData(gl.ARRAY_BUFFER, offset, data);
      offset += data.byteLength; // offset 갱신

      // 화면 지우기
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // 데이터 렌더링
      gl.drawArrays(gl.POINTS, 0, data.length / 2); // 2D 좌표 데이터

      // 다음 프레임 호출
      requestAnimationFrame(updateAndDraw);
    }

    // 애니메이션 시작
    updateAndDraw();
  </script>
</body>
</html>
