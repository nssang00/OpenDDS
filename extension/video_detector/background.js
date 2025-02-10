chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "download_video") {
        chrome.downloads.download({
            url: message.url,
            filename: "video.mp4"
        });
    }
});
