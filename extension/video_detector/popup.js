chrome.runtime.sendMessage({ action: "get_videos" }, (response) => {
    const videoList = document.getElementById("videoList");
    response?.videos?.forEach((video) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = video;
        a.innerText = video;
        a.target = "_blank";
        li.appendChild(a);
        videoList.appendChild(li);
    });
});
