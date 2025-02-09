chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadVideo') {
    const filename = request.title.replace(/[^a-z0-9]/gi, '_') + '.mp4';
    
    chrome.downloads.download({
      url: request.url,
      filename: filename,
      conflictAction: 'uniquify'
    });
  }
});
