const videoMap = new Map(); // { blobURL: m3u8URL }
let pendingM3U8 = null; // 가장 최근 감지된 M3U8 저장

// 📌 Background에서 받은 M3U8 URL 저장
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "newM3U8") {
        console.log("Received M3U8 URL:", message.url);
        pendingM3U8 = message.url;
    }
});

// 📌 MutationObserver 등록 (document.body에서 감지)
const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        if (mutation.type === "childList") {
            mutation.addedNodes.forEach(node => {
                if (node.tagName === "VIDEO") {
                    console.log("New Video Element Detected");
                    observeVideo(node);
                }
            });
        } else if (mutation.type === "attributes" && mutation.attributeName === "src") {
            const video = mutation.target;
            checkVideoSrc(video);
        }
    });
});

// 📌 Body 전체에서 Video 태그 변화를 감지
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });

// 📌 기존 video 태그도 감지하도록 실행
document.querySelectorAll("video").forEach(video => observeVideo(video));

// 📌 Video 태그 감지 함수
function observeVideo(video) {
    if (!video.dataset.observed) {
        video.dataset.observed = "true";
        checkVideoSrc(video);
    }
}

// 📌 video.src 확인 후 Blob URL과 M3U8 매칭
function checkVideoSrc(video) {
    const blobURL = video.src;
    if (blobURL.startsWith("blob:") && pendingM3U8) {
        console.log("Detected Blob URL:", blobURL);

        // 📌 Blob과 M3U8 매칭
        videoMap.set(blobURL, pendingM3U8);
        addDownloadButton(video, pendingM3U8);
        pendingM3U8 = null; // 사용 후 초기화
    }
}

// 📌 다운로드 버튼 추가 함수
function addDownloadButton(video, m3u8URL) {
    if (!video.dataset.downloadButton) {
        video.dataset.downloadButton = "true";

        let btn = document.createElement("button");
        btn.innerText = "Download M3U8";
        btn.style.position = "absolute";
        btn.style.top = "10px";
        btn.style.left = "10px";
        btn.style.zIndex = "9999";
        btn.style.background = "red";
        btn.style.color = "white";
        btn.style.border = "none";
        btn.style.padding = "5px 10px";
        btn.style.cursor = "pointer";
        btn.onclick = () => {
            window.open(m3u8URL);
        };

        video.parentElement.style.position = "relative";
        video.parentElement.appendChild(btn);
    }
}
