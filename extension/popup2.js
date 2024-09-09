document.getElementById('download-btn').addEventListener('click', function() {
  chrome.runtime.sendMessage({ action: 'startDownload' }, function(response) {
    const m3u8Url = response.url;

    if (m3u8Url) {
      // download.html 페이지에서 다운로드 처리
      chrome.tabs.create({ url: chrome.runtime.getURL('download.html?url=' + encodeURIComponent(m3u8Url)) });
    } else {
      alert('No active stream found!');
    }
  });
});
