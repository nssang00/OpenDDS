function addDownloadButton(video) {
    if (video.dataset.hasDownloadButton) return;

    const button = document.createElement("button");
    button.innerText = "Download Video";
    button.style.position = "absolute";
    button.style.top = "10px";
    button.style.right = "10px";
    button.style.backgroundColor = "red";
    button.style.color = "white";
    button.style.padding = "5px";
    button.style.border = "none";
    button.style.cursor = "pointer";
    button.style.zIndex = "9999";

    button.onclick = () => {
        const src = video.src || video.querySelector("source")?.src;
        if (src) {
            chrome.runtime.sendMessage({ action: "download_video", url: src });
        } else {
            alert("No video source found!");
        }
    };

    video.parentElement.style.position = "relative";
    video.parentElement.appendChild(button);
    video.dataset.hasDownloadButton = "true";
}

function scanVideos() {
    document.querySelectorAll("video").forEach(addDownloadButton);
}

// `MutationObserver`로 동적으로 추가된 `video` 태그 감지
const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
            scanVideos(); // 새로운 비디오 감지 및 버튼 추가
        }
    }
});

// DOM 변경 감지 시작
observer.observe(document.body, { childList: true, subtree: true });

// 초기 로드된 비디오 태그 처리
document.addEventListener("DOMContentLoaded", scanVideos);
