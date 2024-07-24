function createStrokePatternStyle(src) {
  let pattern;
  (async () => {

    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = src;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width);  
            canvas.height = Math.round(img.height);
            const ctx = canvas.getContext('2d');
      
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            pattern = ctx.createPattern(canvas, 'repeat');
            console.log('resolve ' + canvas.width)
            resolve(pattern);
          };
          img.onerror = reject;
      });
    };
    try {
      await loadImage(src);
    } catch (error) {
        console.error('이미지를 로드하는 동안 오류가 발생했습니다:', error);
    }
    console.log('wait ' + pattern)
  })();
console.log('ret ' + pattern)  
  return pattern;
  //flatStyle['stroke-color'] = pattern;
  //delete flatStyle['stroke-pattern-src'];
  //console.log('ret')
  //return flatStyle;
}
