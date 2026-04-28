const BATCH = 100;  // 묶음 크기

ws.on('open', () => {
  batchStart = performance.now();
  ws.send(...);
});
ws.on('message', () => {
  batchCount++;

  if (batchCount % BATCH === 0) {
    // 100건 완료될 때마다 평균 계산
    const avg = (performance.now() - batchStart) / BATCH;
    if (round >= warmup) latencies.push(avg);
    round++;
    batchStart = performance.now();  // 다음 배치 시작
  }

  ws.send(...);  // 계속 전송
});
