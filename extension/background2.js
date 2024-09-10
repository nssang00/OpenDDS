let detectedStreams = []; // 감지된 m3u8 URL 저장
let playerTabId = null; // 새 탭의 ID를 저장
let streamDataPerTab = {};

// m3u8 스트림 감지 및 헤더 수정 규칙 동적 추가
chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
     const tabId = details.tabId;
    let contentType = '';

    // Content-Type 헤더를 찾아서 확인
    for (let header of details.responseHeaders) {
      if (header.name.toLowerCase() === 'content-type') {
        contentType = header.value.toLowerCase();
        break;
      }
    }
/////////
    if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegurl')) {
      if (!streamDataPerTab[tabId]) {
        streamDataPerTab[tabId] = [];
      }
      if (!streamDataPerTab[tabId].includes(details.url)) {
        streamDataPerTab[tabId].push(details.url);
      }

      // 해당 탭의 스트림 개수를 배지에 표시
      chrome.action.setBadgeText({ text: streamDataPerTab[tabId].length.toString(), tabId: tabId });

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

// 탭이 전환되었을 때 실행되는 함수
chrome.tabs.onActivated.addListener((activeInfo) => {
  const tabId = activeInfo.tabId;

  // 활성화된 탭의 스트림 데이터를 가져와 배지 업데이트
  chrome.tabs.get(tabId, (tab) => {
    if (tab.url && streamDataPerTab[tabId]) {
      // 배지에 스트림 개수 표시
      chrome.action.setBadgeText({ text: streamDataPerTab[tabId].length.toString(), tabId: tabId });
    } else {
      // 감지된 스트림이 없으면 배지를 비웁니다.
      chrome.action.setBadgeText({ text: "", tabId: tabId });
    }
  });
});

// 탭의 URL이 변경되거나 페이지가 완전히 로드되었을 때 실행되는 함수
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // 페이지가 완전히 로드되었을 때 처리
    if (streamDataPerTab[tabId]) {
      // 감지된 스트림이 있으면 배지 업데이트
      chrome.action.setBadgeText({ text: streamDataPerTab[tabId].length.toString(), tabId: tabId });
    } else {
      // 감지된 스트림이 없으면 배지를 비움
      chrome.action.setBadgeText({ text: "", tabId: tabId });
    }
  }

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getStreamCount') {
    const tabId = message.tabId;
    const streamCount = streamDataPerTab[tabId] ? streamDataPerTab[tabId].length : 0;
    sendResponse({ count: streamCount });
  }
});  
