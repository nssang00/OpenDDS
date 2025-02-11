chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
        const contentTypeHeader = details.responseHeaders.find(header =>
            header.name.toLowerCase() === "content-type"
        );

        if (contentTypeHeader && /application\/(vnd\.apple\.mpegurl|x-mpegURL)/i.test(contentTypeHeader.value)) {
            console.log("Detected M3U8:", details.url, "on tab", details.tabId);

            if (details.tabId > 0) {
                // 감지된 M3U8을 content script로 즉시 전달
                chrome.tabs.sendMessage(details.tabId, { action: "newM3U8", url: details.url });
            }
        }
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
);
