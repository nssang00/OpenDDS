
document.addEventListener("DOMContentLoaded", ()=> {
	console.log("원Hello from content script")
});


chrome.runtime.sendMessage({ type: "FROM_TAB" }, (response) => {
  console.log("Received from background:", response.data);
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'TO_TAB') {
        console.log('message received from chrome.tabs.sendMessage: ' + request.payload.message);
    }

    sendResponse({});
    return true;
});
