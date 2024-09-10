let detectedStreams = []; // 감지된 m3u8 URL 저장
let playerTabId = null; // 새 탭의 ID를 저장

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
      // URL이 중복되지 않으면 추가
      if (!detectedStreams.includes(details.url)) {
        detectedStreams.push(details.url);
        // 팝업 버튼의 숫자 업데이트
        chrome.action.setBadgeText({ text: detectedStreams.length.toString() });
      }

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
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// 팝업 버튼 클릭 시 새 탭 생성 또는 기존 탭 업데이트
chrome.action.onClicked.addListener(() => {
  if (detectedStreams.length === 0) return; // 감지된 스트림이 없으면 무시

  const playerUrl = chrome.runtime.getURL('player.html') + '?streamUrl=' + encodeURIComponent(detectedStreams[0]);

  if (playerTabId === null) {
    // 새 탭 생성
    chrome.tabs.create({ url: playerUrl }, (tab) => {
      playerTabId = tab.id;
    });
  } else {
    // 기존 탭을 업데이트
    chrome.tabs.update(playerTabId, { url: playerUrl });
  }
});

// 요청 완료 후 규칙 제거
chrome.webRequest.onCompleted.addListener(
  function (details) {
    chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [details.requestId]
    });
  },
  { urls: ["<all_urls>"] }
);
