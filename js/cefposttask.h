void ClientHandler::CreateBrowser(CefWindowHandle parent_handle, RECT rect, const std::string& url, std::shared_ptr<JavascriptBindings>& jsBindings) {
    // 현재 스레드가 UI 스레드가 아닌 경우, UI 스레드에서 이 함수를 다시 호출
    if (!CefCurrentlyOn(TID_UI)) {
        CefPostTask(TID_UI, base::Bind(
            static_cast<void(ClientHandler::*)(CefWindowHandle, RECT, const std::string&, std::shared_ptr<JavascriptBindings>&)>
            (&ClientHandler::CreateBrowser),
            this, parent_handle, rect, url, jsBindings));
        return; // 함수 종료
    }

    // UI 스레드에서 실행할 브라우저 생성 로직
    // 여기에서 실제 브라우저 생성 작업을 수행합니다.
    // ...
}
