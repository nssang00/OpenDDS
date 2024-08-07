#include "include/cef_app.h"
#include "include/cef_client.h"
#include "include/cef_render_process_handler.h"
#include "include/wrapper/cef_helpers.h"
#include <queue>
#include <string>

std::queue<std::string> js_function_queue;
bool is_object_registered = false;

class MyV8Handler : public CefV8Handler {
public:
    virtual bool Execute(const CefString& name,
                         CefRefPtr<CefV8Value> object,
                         const CefV8ValueList& arguments,
                         CefRefPtr<CefV8Value>& retval,
                         CefString& exception) override {
        if (name == "registerobject") {
            is_object_registered = true;
            ExecuteQueuedFunctions(CefV8Context::GetCurrentContext()->GetBrowser());
            return true;
        }
        return false;
    }

    void ExecuteQueuedFunctions(CefRefPtr<CefBrowser> browser) {
        while (!js_function_queue.empty()) {
            std::string js_function = js_function_queue.front();
            js_function_queue.pop();
            browser->GetMainFrame()->ExecuteJavaScript(js_function, browser->GetMainFrame()->GetURL(), 0);
        }
    }

    IMPLEMENT_REFCOUNTING(MyV8Handler);
};

class MyRenderProcessHandler : public CefRenderProcessHandler {
public:
    virtual void OnContextCreated(CefRefPtr<CefBrowser> browser,
                                  CefRefPtr<CefFrame> frame,
                                  CefRefPtr<CefV8Context> context) override {
        CefRefPtr<CefV8Value> global = context->GetGlobal();
        CefRefPtr<CefV8Handler> handler = new MyV8Handler();
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
            if (is_object_registered) {
                browser->GetMainFrame()->ExecuteJavaScript(function_name, browser->GetMainFrame()->GetURL(), 0);
            } else {
                js_function_queue.push(function_name);
            }
            return true;
        }
        return false;
    }
};

class MyApp : public CefApp, public CefRenderProcessHandler {
public:
    virtual CefRefPtr<CefRenderProcessHandler> GetRenderProcessHandler() override {
        return this;
    }

    IMPLEMENT_REFCOUNTING(MyApp);
};

int main(int argc, char* argv[]) {
    CefMainArgs main_args(argc, argv);
    CefRefPtr<MyApp> app(new MyApp);
    return CefExecuteProcess(main_args, app, nullptr);
}
