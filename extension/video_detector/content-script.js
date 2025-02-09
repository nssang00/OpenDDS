// 모든 비디오 요소 탐지
function detectVideoElements() {
  const videos = Array.from(document.querySelectorAll('video'));
  const visibleVideos = videos.filter(video => {
    const rect = video.getBoundingClientRect();
    const style = window.getComputedStyle(video);
    
    // 시각적으로 보이는지 확인
    return rect.width > 0 && 
           rect.height > 0 &&
           style.visibility !== 'hidden' &&
           style.opacity !== '0' &&
           !video.hasAttribute('hidden');
  });

  // 확장 프로그램에 결과 전송
  chrome.runtime.sendMessage({
    type: 'VIDEOS_DETECTED',
    count: visibleVideos.length,
    videos: visibleVideos.map(video => ({
      src: video.currentSrc || video.src,
      width: rect.width,
      height: rect.height,
      position: {
        x: rect.left,
        y: rect.top
      }
    }))
  });
}

// 페이지 로드 시 및 동적 콘텐츠 감지
detectVideoElements();
new MutationObserver(detectVideoElements).observe(
  document.body, 
  { childList: true, subtree: true }
);
