function createStrokePatternStyle(src) {
  let pattern;

  (async () => {
    try {
      const img = new Image();
      img.src = src;

      // 이미지를 로드하는 동안 대기
      pattern = await new Promise((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width);  
          canvas.height = Math.round(img.height);
          const ctx = canvas.getContext('2d');

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const createdPattern = ctx.createPattern(canvas, 'repeat');
          console.log('resolve ' + canvas.width);
          resolve(createdPattern);
        };

        img.onerror = () => {
          reject(new Error('이미지를 로드하는 동안 오류가 발생했습니다.'));
        };
      });

    } catch (error) {
      console.error(error);
    }
    console.log('wait ' + pattern);
  })();

  console.log('ret ' + pattern);
  return pattern;
}
