#include <map>
#include <queue>
#include <string>
#include <mutex>
#include "include/cef_browser.h"
#include "include/cef_frame.h"
#include "include/cef_values.h"

// 함수 호출 인자를 저장할 구조체 정의
struct FunctionCall {
    CefRefPtr<CefBrowser> browser;
    CefRefPtr<CefFrame> frame;
    int callbackId;
    std::string name;
    CefRefPtr<CefListValue> parameters;
};

// 키별로 큐를 관리하는 맵 정의 및 동기화를 위한 뮤텍스
std::map<std::string, std::queue<FunctionCall>> functionCallMap;
std::mutex mapMutex;  // 맵에 대한 동기화를 위한 뮤텍스

// 특정 키에 대한 큐에 함수 호출 인자 추가
void AddFunctionCallToQueue(const std::string& key, 
                            CefRefPtr<CefBrowser> browser, 
                            CefRefPtr<CefFrame> frame, 
                            int callbackId, 
                            const std::string& name, 
                            const CefRefPtr<CefListValue>& parameters) {
    std::lock_guard<std::mutex> lock(mapMutex);  // 뮤텍스를 잠금

    FunctionCall funcCall = {browser, frame, callbackId, name, parameters};
    functionCallMap[key].push(funcCall);
}

// 특정 키에 대한 모든 함수 호출 처리
void ExecuteFunctionsForKey(const std::string& key) {
    std::lock_guard<std::mutex> lock(mapMutex);  // 뮤텍스를 잠금

    auto it = functionCallMap.find(key);
    if (it != functionCallMap.end()) {
        std::queue<FunctionCall>& funcQueue = it->second;

        while (!funcQueue.empty()) {
            FunctionCall funcCall = funcQueue.front();
            funcQueue.pop();

            // 실제 함수 호출 처리
            // CallSomeFunction(funcCall.browser, funcCall.frame, funcCall.callbackId, funcCall.name, funcCall.parameters);
        }

        // 모든 함수 호출 후, 해당 큐를 맵에서 제거
        functionCallMap.erase(it);
    }
}

// 조건에 따라 특정 키의 함수 호출 실행
void OnSpecialConditionMet(const std::string& key) {
    ExecuteFunctionsForKey(key);
}
