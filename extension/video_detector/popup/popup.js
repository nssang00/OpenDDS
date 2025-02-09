document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get('detectedVideos', ({ detectedVideos }) => {
    const list = document.getElementById('video-list');
    list.innerHTML = detectedVideos?.length > 0
      ? detectedVideos.map(video => `
          <div class="video-item">
            <p>Source: ${video.src}</p>
            <p>Size: ${video.width}x${video.height}</p>
          </div>
        `).join('')
      : '<p>No videos found.</p>';
  });
});
