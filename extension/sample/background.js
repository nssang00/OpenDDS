// 백그라운드 스크립트
let dataToSend = "Hello from background!";

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed!");
});

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "getData") {
    sendResponse({ data: dataToSend });
  } else if (request.message === "sendData") {
    console.log("Data received from content script:", request.data);
  }
});

// 팝업이 열릴 때 데이터를 저장
chrome.action.onClicked.addListener((tab) => {
  chrome.storage.local.set({ data: dataToSend });
});
