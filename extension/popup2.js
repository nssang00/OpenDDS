document.addEventListener('DOMContentLoaded', () => {
  const streamCountElement = document.getElementById('stream-count');
  const openPlayerButton = document.getElementById('open-player');

  // 백그라운드에서 현재 감지된 스트림 수를 받아와서 표시
  chrome.runtime.sendMessage({ action: 'getStreamCount' }, (response) => {
    streamCountElement.textContent = response.count;
  });

  // 버튼 클릭 시 새 탭 열거나 기존 탭을 업데이트
  openPlayerButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openPlayerTab' });
  });
});
