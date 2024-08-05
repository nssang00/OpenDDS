function tileLoadFunction(imageTile, src) {
  fetch(src)
    .then(response => response.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      imageTile.getImage().src = url;
      
      // Blob URL을 사용한 후에는 해제해야 합니다.
      imageTile.getImage().onload = () => {
        URL.revokeObjectURL(url);
      };
    })
    .catch(error => {
      console.error('Tile load error:', error);
    });
}
