// Renderer process
#include <queue>
#include <utility>
#include "include/cef_v8.h"

class MyRenderProcessHandler : public CefClient, public CefRenderProcessHandler {
public:
    MyRenderProcessHandler() : is_binding_complete_(false) {}

    // 바인딩이 완료되었는지 확인하는 플래그
    bool is_binding_complete_;
    std::queue<std::pair<CefRefPtr<CefV8Value>, CefV8ValueList>> function_call_queue_;

    void OnContextCreated(CefRefPtr<CefBrowser> browser, CefRefPtr<CefFrame> frame, CefRefPtr<CefV8Context> context) override {
        // 바인딩 완료 플래그 설정
        is_binding_complete_ = true;
        // 대기 큐에 저장된 함수 호출 처리
        ProcessFunctionCallQueue(context);
    }

    void QueueFunctionCall(CefRefPtr<CefV8Value> func, CefV8ValueList args) {
        if (is_binding_complete_) {
            func->ExecuteFunction(nullptr, args);
        } else {
            function_call_queue_.emplace(func, args);
        }
    }

private:
    void ProcessFunctionCallQueue(CefRefPtr<CefV8Context> context) {
        while (!function_call_queue_.empty()) {
            auto [func, args] = function_call_queue_.front();
            function_call_queue_.pop();
            if (func && func->IsFunction()) {
                func->ExecuteFunction(nullptr, args);
            }
        }
    }

    IMPLEMENT_REFCOUNTING(MyRenderProcessHandler);
};
