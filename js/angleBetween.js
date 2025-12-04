  function angleBetween(p0, pA, pB) {
    const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
    const bx = pB[0] - p0[0], by = pB[1] - p0[1];
    
    const lenA2 = ax * ax + ay * ay;
    const lenB2 = bx * bx + by * by;
    if (lenA2 < 1e-12 || lenB2 < 1e-12) return null;
    
    const dot = ax * bx + ay * by;
    const cross = ax * by - ay * bx;
    
    const cosAngle = dot / Math.sqrt(lenA2 * lenB2);
    
    if (cosAngle > 0.985) return null;
    
    const angle = Math.atan2(cross, dot);
    return angle < 0 ? angle + 2 * Math.PI : angle;
  }

let angle0 = -1, angle1 = -1;
let newAngleTangentSum = currentAngleTangentSum;

if (beforeIndex !== null) {
  angle0 = angleBetween(p0world, p1world, pBworld);
  if (angle0 !== null) {
    newAngleTangentSum += Math.tan((angle0 - Math.PI) / 2);
  }
}

if (afterIndex !== null) {
  angle1 = angleBetween(p1world, p0world, pAworld);
  if (angle1 !== null) {
    newAngleTangentSum += Math.tan((Math.PI - angle1) / 2);
  }
}
/////////////////////
//////////////////////
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>각도 계산 성능 비교</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #333;
      text-align: center;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    button {
      padding: 10px 20px;
      font-size: 16px;
      cursor: pointer;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      transition: background 0.3s;
    }
    button:hover {
      background: #45a049;
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .input-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    input[type="number"] {
      padding: 8px;
      font-size: 14px;
      border: 1px solid #ddd;
      border-radius: 4px;
      width: 150px;
    }
    label {
      font-weight: bold;
    }
    .results {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .result-card {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      border-left: 4px solid #4CAF50;
    }
    .result-card.optimized {
      border-left-color: #2196F3;
    }
    .result-card h3 {
      margin-top: 0;
      color: #333;
    }
    .metric {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .metric:last-child {
      border-bottom: none;
    }
    .metric-label {
      font-weight: 500;
      color: #666;
    }
    .metric-value {
      font-weight: bold;
      color: #333;
    }
    .improvement {
      background: #e8f5e9;
      padding: 15px;
      border-radius: 4px;
      margin-top: 20px;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      color: #2e7d32;
    }
    .improvement.negative {
      background: #ffebee;
      color: #c62828;
    }
    .progress {
      margin-top: 10px;
      font-style: italic;
      color: #666;
    }
  </style>
</head>
<body>
  <h1>각도 계산 함수 성능 비교</h1>
  
  <div class="container">
    <div class="controls">
      <div class="input-group">
        <label for="iterations">반복 횟수:</label>
        <input type="number" id="iterations" value="1000000" min="10000" step="10000">
      </div>
      <div class="input-group">
        <label for="straightRatio">직선 비율(%):</label>
        <input type="number" id="straightRatio" value="70" min="0" max="100">
      </div>
      <button id="runTest">성능 테스트 실행</button>
    </div>
    <div class="progress" id="progress"></div>
  </div>

  <div class="container">
    <div class="results" id="results"></div>
    <div id="improvement"></div>
  </div>

  <script>
    // 기존 함수
    function angleBetweenOriginal(p0, pA, pB) {
      const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
      const bx = pB[0] - p0[0], by = pB[1] - p0[1];
      if ((ax * ax + ay * ay) < 1e-12 || (bx * bx + by * by) < 1e-12) return 0;
      const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
      return angle < 0 ? angle + 2 * Math.PI : angle;
    }

    function processOriginal(p0, pA, pB, currentSum) {
      const angle = angleBetweenOriginal(p0, pA, pB);
      let newSum = currentSum;
      if (Math.cos(angle) <= 0.985) {
        newSum += Math.tan((angle - Math.PI) / 2);
      }
      return { angle, newSum };
    }

    // 최적화 함수
    function angleBetweenOptimized(p0, pA, pB) {
      const ax = pA[0] - p0[0], ay = pA[1] - p0[1];
      const bx = pB[0] - p0[0], by = pB[1] - p0[1];
      
      const lenA2 = ax * ax + ay * ay;
      const lenB2 = bx * bx + by * by;
      if (lenA2 < 1e-12 || lenB2 < 1e-12) return null;
      
      const dot = ax * bx + ay * by;
      const cross = ax * by - ay * bx;
      
      const cosAngle = dot / Math.sqrt(lenA2 * lenB2);
      
      if (cosAngle > 0.985) return null;
      
      const angle = Math.atan2(cross, dot);
      return angle < 0 ? angle + 2 * Math.PI : angle;
    }

    function processOptimized(p0, pA, pB, currentSum) {
      const angle = angleBetweenOptimized(p0, pA, pB);
      let newSum = currentSum;
      if (angle !== null) {
        newSum += Math.tan((angle - Math.PI) / 2);
      }
      return { angle: angle !== null ? angle : -1, newSum };
    }

    // 테스트 데이터 생성
    function generateTestData(count, straightRatio) {
      const data = [];
      for (let i = 0; i < count; i++) {
        const isStraight = Math.random() * 100 < straightRatio;
        
        const p0 = [Math.random() * 100, Math.random() * 100];
        const p1 = [Math.random() * 100, Math.random() * 100];
        
        let p2;
        if (isStraight) {
          // 거의 직선
          const dx = p1[0] - p0[0];
          const dy = p1[1] - p0[1];
          const noise = (Math.random() - 0.5) * 0.1; // 작은 노이즈
          p2 = [p1[0] + dx + noise, p1[1] + dy + noise];
        } else {
          // 급격한 꺾임
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * 20 + 10;
          p2 = [
            p1[0] + Math.cos(angle) * dist,
            p1[1] + Math.sin(angle) * dist
          ];
        }
        
        data.push({ p0, p1, p2 });
      }
      return data;
    }

    // 성능 테스트 실행
    document.getElementById('runTest').addEventListener('click', async () => {
      const button = document.getElementById('runTest');
      const progress = document.getElementById('progress');
      
      button.disabled = true;
      progress.textContent = '테스트 실행 중...';
      
      const iterations = parseInt(document.getElementById('iterations').value);
      const straightRatio = parseInt(document.getElementById('straightRatio').value);
      
      // 약간의 딜레이를 주어 UI 업데이트
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const testData = generateTestData(iterations, straightRatio);
      
      // 결과 일치성 검증
      progress.textContent = '결과 일치성 검증 중...';
      await new Promise(resolve => setTimeout(resolve, 50));
      
      let mismatchCount = 0;
      let maxDiff = 0;
      const sampleSize = Math.min(1000, iterations);
      
      for (let i = 0; i < sampleSize; i++) {
        const { p0, p1, p2 } = testData[i];
        const resultOriginal = processOriginal(p0, p1, p2, 0);
        const resultOptimized = processOptimized(p0, p1, p2, 0);
        
        // 각도 비교 (null/-1 처리)
        const angleOriginal = resultOriginal.angle;
        const angleOptimized = resultOptimized.angle;
        
        // -1은 null과 동일하게 처리
        const isAngleMatch = 
          (angleOriginal === -1 && angleOptimized === -1) ||
          (angleOriginal !== -1 && angleOptimized !== -1 && Math.abs(angleOriginal - angleOptimized) < 1e-10);
        
        // newSum 비교
        const isSumMatch = Math.abs(resultOriginal.newSum - resultOptimized.newSum) < 1e-10;
        
        if (!isAngleMatch || !isSumMatch) {
          mismatchCount++;
          const diff = Math.abs(resultOriginal.newSum - resultOptimized.newSum);
          if (diff > maxDiff) maxDiff = diff;
        }
      }
      
      // 기존 함수 테스트
      progress.textContent = '기존 함수 테스트 중...';
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const startOriginal = performance.now();
      let sumOriginal = 0;
      const anglesOriginal = [];
      for (let i = 0; i < testData.length; i++) {
        const { p0, p1, p2 } = testData[i];
        const result = processOriginal(p0, p1, p2, sumOriginal);
        sumOriginal = result.newSum;
        if (i < 10) anglesOriginal.push(result.angle);
      }
      const timeOriginal = performance.now() - startOriginal;
      
      // 최적화 함수 테스트
      progress.textContent = '최적화 함수 테스트 중...';
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const startOptimized = performance.now();
      let sumOptimized = 0;
      const anglesOptimized = [];
      for (let i = 0; i < testData.length; i++) {
        const { p0, p1, p2 } = testData[i];
        const result = processOptimized(p0, p1, p2, sumOptimized);
        sumOptimized = result.newSum;
        if (i < 10) anglesOptimized.push(result.angle);
      }
      const timeOptimized = performance.now() - startOptimized;
      
      // 결과 표시
      const improvement = ((timeOriginal - timeOptimized) / timeOriginal * 100).toFixed(2);
      const speedup = (timeOriginal / timeOptimized).toFixed(2);
      const sumDiff = Math.abs(sumOriginal - sumOptimized);
      const isResultMatch = sumDiff < 1e-6;
      
      document.getElementById('results').innerHTML = `
        <div class="result-card">
          <h3>기존 함수</h3>
          <div class="metric">
            <span class="metric-label">실행 시간:</span>
            <span class="metric-value">${timeOriginal.toFixed(2)} ms</span>
          </div>
          <div class="metric">
            <span class="metric-label">반복 횟수:</span>
            <span class="metric-value">${iterations.toLocaleString()}</span>
          </div>
          <div class="metric">
            <span class="metric-label">평균 시간:</span>
            <span class="metric-value">${(timeOriginal / iterations * 1000).toFixed(4)} μs</span>
          </div>
          <div class="metric">
            <span class="metric-label">최종 합계:</span>
            <span class="metric-value">${sumOriginal.toFixed(6)}</span>
          </div>
        </div>
        
        <div class="result-card optimized">
          <h3>최적화 함수</h3>
          <div class="metric">
            <span class="metric-label">실행 시간:</span>
            <span class="metric-value">${timeOptimized.toFixed(2)} ms</span>
          </div>
          <div class="metric">
            <span class="metric-label">반복 횟수:</span>
            <span class="metric-value">${iterations.toLocaleString()}</span>
          </div>
          <div class="metric">
            <span class="metric-label">평균 시간:</span>
            <span class="metric-value">${(timeOptimized / iterations * 1000).toFixed(4)} μs</span>
          </div>
          <div class="metric">
            <span class="metric-label">최종 합계:</span>
            <span class="metric-value">${sumOptimized.toFixed(6)}</span>
          </div>
        </div>
        
        <div class="result-card" style="grid-column: 1 / -1; border-left-color: ${isResultMatch ? '#4CAF50' : '#f44336'}">
          <h3>결과 검증 (샘플 ${sampleSize.toLocaleString()}개)</h3>
          <div class="metric">
            <span class="metric-label">일치 여부:</span>
            <span class="metric-value" style="color: ${isResultMatch ? '#4CAF50' : '#f44336'}">
              ${isResultMatch ? '✓ 일치' : '✗ 불일치'}
            </span>
          </div>
          <div class="metric">
            <span class="metric-label">불일치 케이스:</span>
            <span class="metric-value">${mismatchCount} / ${sampleSize}</span>
          </div>
          <div class="metric">
            <span class="metric-label">최종 합계 차이:</span>
            <span class="metric-value">${sumDiff.toExponential(2)}</span>
          </div>
          <div class="metric">
            <span class="metric-label">최대 오차:</span>
            <span class="metric-value">${maxDiff.toExponential(2)}</span>
          </div>
        </div>
      `;
      
      const improvementClass = improvement > 0 ? '' : 'negative';
      document.getElementById('improvement').innerHTML = `
        <div class="improvement ${improvementClass}">
          성능 개선: ${improvement > 0 ? '+' : ''}${improvement}% 
          (${speedup}배 ${improvement > 0 ? '빠름' : '느림'})
        </div>
      `;
      
      progress.textContent = '테스트 완료!';
      button.disabled = false;
    });

    // 페이지 로드 시 자동 실행
    window.addEventListener('load', () => {
      document.getElementById('runTest').click();
    });
  </script>
</body>
</html>
