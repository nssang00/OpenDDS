// 규칙 ID 정의
const m3u8RuleId = 1001;

// 세션 규칙을 업데이트하여 .m3u8 요청을 감지하는 규칙 추가
chrome.declarativeNetRequest.updateSessionRules(
  {
    addRules: [{
      id: m3u8RuleId,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          {
            "header": "x-m3u8-detected",
            "operation": "set",
            "value": "true"
          }
        ]
      },
      condition: {
        urlFilter: "*.m3u8",
        resourceTypes: ["xmlhttprequest", "media"]
      }
    }],
    removeRuleIds: [] // 필요시 다른 규칙을 제거 가능
  },
  () => {
    console.log(`M3U8 detection rule added with ID ${m3u8RuleId}`);
  }
);

// 응답 헤더를 확인하여 x-m3u8-detected 헤더가 있는지 확인
chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    const headers = details.responseHeaders;
    const m3u8Header = headers.find(header => header.name.toLowerCase() === 'x-m3u8-detected');

    if (m3u8Header && m3u8Header.value === 'true') {
      // .m3u8 파일이 감지되면 다운로드 수행
      chrome.downloads.download({
        url: details.url,
        filename: 'video_playlist.m3u8'
      });
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);
