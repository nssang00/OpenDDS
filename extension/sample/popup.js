// 팝업 스크립트
document.addEventListener("DOMContentLoaded", () => {
  const resultDiv = document.getElementById("result");

  // 백그라운드에서 저장한 데이터 가져오기
  chrome.storage.local.get("data", (data) => {
    resultDiv.textContent = data.data || "No data found.";
  });
});
