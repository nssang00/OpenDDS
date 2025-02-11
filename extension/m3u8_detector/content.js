let m3u8List = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "newM3U8") {
        console.log("Received M3U8 URL:", message.url);

        // 리스트에 추가
        m3u8List.push(message.url);

        // video 태그 위에 다운로드 버튼 추가
        document.querySelectorAll("video").forEach(video => {
            if (!video.dataset.downloadButton) {
                video.dataset.downloadButton = "true";

                let btn = document.createElement("button");
                btn.innerText = "Download M3U8";
                btn.style.position = "absolute";
                btn.style.top = "10px";
                btn.style.left = "10px";
                btn.onclick = () => {
                    window.open(message.url);
                };

                video.parentElement.appendChild(btn);
            }
        });
    }
});
