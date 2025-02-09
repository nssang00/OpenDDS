// 컨텐츠 스크립트에서 메시지 수신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VIDEOS_DETECTED') {
    chrome.action.setBadgeText({
      text: message.count > 0 ? `${message.count}` : ''
    });
    // 저장소에 비디오 정보 저장
    chrome.storage.local.set({ detectedVideos: message.videos });
  }
});
