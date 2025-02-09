document.addEventListener('DOMContentLoaded', () => {
  const videoList = document.getElementById('video-list');
  const refreshBtn = document.getElementById('refresh-btn');

  // 저장된 비디오 정보 불러오기
  function updateVideoList() {
    chrome.storage.local.get(['videos'], (result) => {
      const videos = result.videos || [];
      videoList.innerHTML = videos.map(video => `
        <div class="video-item">
          <p><strong>Source:</strong> ${video.src}</p>
          <p><strong>Dimensions:</strong> ${video.width}×${video.height}</p>
        </div>
      `).join('');
    });
  }

  // 새로고침 버튼
  refreshBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['content-script.js']
      });
      updateVideoList();
    });
  });

  // 초기 로드
  updateVideoList();
});
