// 콘텐츠 스크립트
console.log("Content script loaded!");

// 백그라운드로 메시지 보내기
chrome.runtime.sendMessage({ message: "getData" }, (response) => {
  console.log("Received from background:", response.data);
});
