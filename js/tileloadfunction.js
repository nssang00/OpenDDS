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


source.setTileLoadFunction((tile, src) => {
  const image = tile.getImage();
  fetch(src)
    .then((response) => {
      if (retryCodes.includes(response.status)) {
        retries[src] = (retries[src] || 0) + 1;
        if (retries[src] <= 3) {
          setTimeout(() => tile.load(), retries[src] * 1000);
        }
        return Promise.reject();
      }
      return response.blob();
    })
    .then((blob) => {
      const imageUrl = URL.createObjectURL(blob);
      image.src = imageUrl;
      setTimeout(() => URL.revokeObjectURL(imageUrl), 5000);
    })
    .catch(() => tile.setState(3)); // error
});
