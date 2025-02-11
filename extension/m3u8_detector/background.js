chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
        const contentTypeHeader = details.responseHeaders.find(header =>
            header.name.toLowerCase() === "content-type"
        );

        if (contentTypeHeader && /application\/(vnd\.apple\.mpegurl|x-mpegURL)/i.test(contentTypeHeader.value)) {
            console.log("Detected M3U8 stream:", details.url, "on tab", details.tabId);

            if (details.tabId > 0) {
                // 해당 요청이 발생한 탭에만 메시지 전송
                chrome.tabs.sendMessage(details.tabId, { action: "newM3U8", url: details.url });
            }
        }
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
);
