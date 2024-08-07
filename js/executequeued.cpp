#include "include/cef_app.h"
#include "include/cef_client.h"
#include "include/cef_render_process_handler.h"
#include "include/wrapper/cef_helpers.h"
#include <queue>
#include <string>

class FunctionQueueManager {
public:
    void RegisterObject() {
        is_object_registered_ = true;
        ExecuteQueuedFunctions();
    }

    void QueueFunction(const std::string& function_name, CefRefPtr<CefBrowser> browser) {
        if (is_object_registered_) {
            browser->GetMainFrame()->ExecuteJavaScript(function_name, browser->GetMainFrame()->GetURL(), 0);
        } else {
            js_function_queue_.push(function_name);
        }
    }

private:
    void ExecuteQueuedFunctions() {
        CefRefPtr<CefBrowser> browser = CefV8Context::GetCurrentContext()->GetBrowser();
        while (!js_function_queue_.empty()) {
            std::string js_function = js_function_queue_.front();
            js_function_queue_.pop();
            browser->GetMainFrame()->ExecuteJavaScript(js_function, browser->GetMainFrame()->GetURL(), 0);
        }
    }

    bool is_object_registered_ = false;
    std::queue<std::string> js_function_queue_;
};

class MyV8Handler : public CefV8Handler {
public:
    explicit MyV8Handler(FunctionQueueManager* manager) : manager_(manager) {}

    virtual bool Execute(const CefString& name,
                         CefRefPtr<CefV8Value> object,
                         const CefV8ValueList& arguments,
                         CefRefPtr<CefV8Value>& retval,
                         CefString& exception) override {
        if (name == "registerobject") {
            manager_->RegisterObject();
            return true;
        }
        return false;
    }

private:
    FunctionQueueManager* manager_;
    IMPLEMENT_REFCOUNTING(MyV8Handler);
};

class MyRenderProcessHandler : public CefRenderProcessHandler {
public:
    MyRenderProcessHandler() : manager_(new FunctionQueueManager) {}

    virtual void OnContextCreated(CefRefPtr<CefBrowser> browser,
                                  CefRefPtr<CefFrame> frame,
                                  CefRefPtr<CefV8Context> context) override {
        CefRefPtr<CefV8Value> global = context->GetGlobal();
        CefRefPtr<CefV8Handler> handler = new MyV8Handler(manager_.get());
        CefRefPtr<CefV8Value> func = CefV8Value::CreateFunction("registerobject", handler);
        global->SetValue("registerobject", func, V8_PROPERTY_ATTRIBUTE_NONE);
    }

    virtual bool OnProcessMessageReceived(CefRefPtr<CefBrowser> browser,
                                          CefProcessId source_process,
                                          CefRefPtr<CefProcessMessage> message) override {
        CEF_REQUIRE_RENDERER_THREAD();
        std::string message_name = message->GetName();
        if (message_name == "CallFunction") {
            std::string function_name = message->GetArgumentList()->GetString(0);
            manager_->QueueFunction(function_name, browser);
            return true;
        }
        return false;
    }

private:
    std::unique_ptr<FunctionQueueManager> manager_;
    IMPLEMENT_REFCOUNTING(MyRenderProcessHandler);
};

class MyApp : public CefApp, public CefRenderProcessHandler {
public:
    virtual CefRefPtr<CefRenderProcessHandler> GetRenderProcessHandler() override {
        return new MyRenderProcessHandler;
    }

    IMPLEMENT_REFCOUNTING(MyApp);
};

int main(int argc, char* argv[]) {
    CefMainArgs main_args(argc, argv);
    CefRefPtr<MyApp> app(new MyApp);
    return CefExecuteProcess(main_args, app, nullptr);
}
