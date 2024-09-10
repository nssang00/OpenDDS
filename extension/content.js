// m3u8 URL을 수신하고 비디오 태그를 업데이트
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.m3u8Url) {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      const src = video.src || [...video.getElementsByTagName('source')].map(source => source.src).find(src => src);
      if (src && src.startsWith('blob:')) {
        // blob URL을 처리하여 다운로드 버튼 추가
        detectBlobSource(video, request.m3u8Url);
      }
    });
  }
});

// blob URL을 사용하는 비디오의 MediaSource 객체를 추적
function detectBlobSource(video, m3u8Url) {
  if (video.srcObject && video.srcObject instanceof MediaSource) {
    const mediaSource = video.srcObject;
    
    // MediaSource 객체의 sourceBuffers를 통해 m3u8 스트림 확인
    mediaSource.addEventListener('sourceopen', () => {
      const sourceBuffer = mediaSource.sourceBuffers[0];
      if (sourceBuffer) {
        // 스트림 정보를 추적할 수 있는 추가 로직
        console.log('Detected MediaSource:', mediaSource);
        addDownloadButton(video, m3u8Url);
      }
    });
  }
}

// 비디오 태그에 다운로드 버튼 추가
function addDownloadButton(videoElement, m3u8Url) {
  const button = document.createElement('button');
  button.innerText = 'Download';
  button.style.position = 'absolute';
  button.style.top = '10px';
  button.style.left = '10px';
  button.onclick = function() {
    // 다운로드 요청을 background.js로 전송
    chrome.runtime.sendMessage({ download: m3u8Url });
  };
  videoElement.parentElement.style.position = 'relative'; // 부모 요소의 위치 지정
  videoElement.parentElement.appendChild(button);
}
