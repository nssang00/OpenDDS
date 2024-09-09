let currentStreamUrl = null; // 현재 활성화된 스트림 주소 저장

// M3U8 요청을 감지 (onBeforeRequest, onHeadersReceived 선택 가능)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = details.url;
    
    // M3U8 파일 요청 감지
    if (url.includes('.m3u8')) {
      currentStreamUrl = url; // 현재 URL 저장
      // 아이콘 활성화
      chrome.action.setIcon({ path: "icons/active-icon.png" });
      
      // 다운로드 페이지로 메시지 전달 (팝업 클릭 시)
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'startDownload') {
          sendResponse({ url: currentStreamUrl }); // M3U8 주소 전달
        }
      });
    }
  },
  { urls: ["<all_urls>"] } // 모든 URL 추적, 필요 시 필터링 추가
);
