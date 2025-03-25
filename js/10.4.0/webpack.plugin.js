class MyWorkerPlugin {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('MyWorkerPlugin', (compilation, callback) => {
      // worker.js의 빌드 결과물 찾기
      const workerAsset = compilation.assets['worker.js'];

      if (workerAsset) {
        // worker.js의 내용을 가져오기
        const workerSource = workerAsset.source();

        // Blob 형태로 변환하는 JavaScript 코드 생성
        const workerBlobCode = `
          const blob = new Blob([${JSON.stringify(workerSource)}], { type: 'application/javascript' });
          const worker = new Worker(URL.createObjectURL(blob));
          export default worker;
        `;

        // 새로운 파일 생성
        compilation.assets['worker.create.js'] = {
          source: () => workerBlobCode,
          size: () => workerBlobCode.length,
        };
      }

      callback();
    });
  }
}

module.exports = MyWorkerPlugin;
