// 스타일 주입
const highlightStyle = document.createElement('style');
highlightStyle.textContent = `
  .video-highlight-box {
    position: relative;
    outline: 3px solid #ff0000 !important;
    box-shadow: 0 0 15px rgba(255, 0, 0, 0.4) !important;
    margin: 5px;
    transition: outline 0.3s ease;
  }
  .video-download-btn {
    position: absolute;
    top: -35px;
    right: 0;
    background: #ff4444;
    color: white !important;
    padding: 6px 12px;
    font-family: Arial, sans-serif;
    font-size: 12px;
    cursor: pointer;
    border: none;
    border-radius: 4px;
    z-index: 99999;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .video-download-btn:hover {
    background: #ff6666;
  }
  .video-download-btn::before {
    content: "⬇️";
  }
`;
document.head.appendChild(highlightStyle);

// 비디오 처리 함수
function processVideos() {
  const videos = document.querySelectorAll('video');
  
  videos.forEach(video => {
    if (!video.classList.contains('video-highlight-box')) {
      // 하이라이트 추가
      video.classList.add('video-highlight-box');
      
      // 다운로드 버튼 생성
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'video-download-btn';
      downloadBtn.title = 'Download this video';
      
      // 버튼 클릭 이벤트
      downloadBtn.onclick = (e) => {
        e.stopPropagation();
        chrome.runtime.sendMessage({
          action: 'downloadVideo',
          url: video.src,
          title: document.title
        });
      };
      
      // 비디오 컨테이너에 버튼 추가
      const container = video.parentNode;
      container.insertBefore(downloadBtn, video);
    }
  });
}

// DOM 변화 감지
const observer = new MutationObserver((mutations) => {
  mutations.forEach(() => processVideos());
});
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// 초기 실행 + 이벤트 핸들러
window.addEventListener('load', processVideos);
window.addEventListener('resize', processVideos);
window.addEventListener('scroll', processVideos);
