// 백그라운드 스크립트
let dataToSend = "Hello from background!";

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed!");
});

//this will listen to the message from the content script and send it to 
//the content scripts of all the active tabs
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "FROM_TAB") {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id && tab.id !== sender.tab?.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'TO_TAB', data  });
          }
        });
      });    
    //sendResponse({ data: dataToSend });
  } 
});

// 팝업이 열릴 때 데이터를 저장
chrome.action.onClicked.addListener((tab) => {
  chrome.storage.local.set({ data: dataToSend });
});
