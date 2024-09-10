// m3u8 스트림 감지 및 헤더 수정 규칙 동적 추가
chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    let contentType = '';

    // Content-Type 헤더를 찾아서 확인
    for (let header of details.responseHeaders) {
      if (header.name.toLowerCase() === 'content-type') {
        contentType = header.value.toLowerCase();
        break;
      }
    }

    // m3u8 스트림의 Content-Type 확인
    if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegurl')) {
      // 동적으로 헤더 수정 규칙 추가
      chrome.declarativeNetRequest.updateSessionRules({
        addRules: [
          {
            id: details.requestId, // 요청마다 고유 ID 사용
            priority: 1,
            action: {
              type: 'modifyHeaders',
              requestHeaders: [
                {
                  header: 'Referer',
                  operation: 'set',
                  value: details.initiator || details.url
                },
                {
                  header: 'Origin',
                  operation: 'set',
                  value: details.initiator || details.url
                }
              ]
            },
            condition: {
              urlFilter: details.url,
              resourceTypes: ['xmlhttprequest', 'sub_frame', 'main_frame']
            }
          }
        ]
      });

      // m3u8 URL을 팝업에 전달해 플레이어 탭을 엽니다.
      chrome.runtime.sendMessage({ action: 'openPlayerTab', url: details.url });
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// 요청이 완료되면 규칙을 삭제
chrome.webRequest.onCompleted.addListener(
  function (details) {
    // 요청이 완료되면 규칙 제거
    chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [details.requestId]
    });
  },
  { urls: ["<all_urls>"] }
);
