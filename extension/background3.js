chrome.webRequest.onHeadersReceived.addListener(
  function(details) {
    const headers = details.responseHeaders;
    const m3u8Header = headers.find(header => 
      header.name.toLowerCase() === 'content-type' && 
      (header.value.includes('application/vnd.apple.mpegurl') || header.value.includes('application/x-mpegURL'))
    );

    if (m3u8Header) {
      // m3u8 URL을 저장
      chrome.storage.local.set({ m3u8Url: details.url });
      
      // CORS 문제를 해결하기 위한 규칙 추가
      chrome.declarativeNetRequest.updateSessionRules({
        addRules: [{
          id: 1,
          priority: 1,
          action: {
            type: "modifyHeaders",
            responseHeaders: [
              { header: "Access-Control-Allow-Origin", operation: "set", value: "*" }
            ]
          },
          condition: {
            urlFilter: "*",
            resourceTypes: ["xmlhttprequest", "media"]
          }
        }],
        removeRuleIds: [1]
      });
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);
