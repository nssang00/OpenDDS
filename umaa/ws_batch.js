
`batchCount`가 `BATCH`의 배수가 될 때마다 배치 1개 완료니까:

```js
// round 없이 batchCount만으로 처리
ws.on('message', () => {
  batchCount++;

  if (batchCount % BATCH === 0) {
    const avg = (performance.now() - batchStart) / BATCH;
    const completedBatches = batchCount / BATCH;         // round 대신 이걸로
    if (completedBatches > warmup) latencies.push(avg);
    batchStart = performance.now();
  }

  ws.send(...);
});
```

`batchCount / BATCH`가 곧 완료된 배치 수(= 기존 round)라서 변수 하나로 충분해. 수정해줄까?
