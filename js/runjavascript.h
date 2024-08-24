void handleResult(const Variant& result) {
    std::cout << "Result: " << result << std::endl;
}

template<typename... Args>
void runJavaScript(const std::string& name, Args... args, const std::function<void(const Variant&)>& resultCallback = {}) {
    // JavaScript 함수 호출 로직 (예제에서 생략)
    std::cout << "Calling JavaScript function: " << name << std::endl;
    // 인자 처리 (예: std::vector로 변환)
    std::vector<Variant> arguments = { static_cast<Variant>(args)... };

    // 예시로 결과를 생성
    Variant result = 42; // 호출 결과 예시

    // 콜백이 등록되어 있다면 호출
    if (resultCallback) {
        resultCallback(result);
    }
}

// 사용 예시
int main() {
    runJavaScript("myFunction", 1, 2.5, "example", [](const Variant& result) {
        // 결과 처리
        std::cout << result << std::endl;
    });

    return 0;
}

void MyClass::execute() {
    runJavaScript("myFunction", 1, 2.5, "example", [this](const Variant& result) {
        // 멤버변수에 접근
        std::cout << "Result: " << result << this->memberVariable << std::endl;
    });
}


////////
#include <functional>
#include <type_traits>
#include <tuple>
#include <iostream>
#include <vector>

template<typename... Args>
void runJavaScript(const std::string& name, Args... args) {
    // 인자 개수 체크
    const size_t numArgs = sizeof...(args);

    // 인자 중 마지막이 std::function인지 확인
    typedef typename std::tuple_element<numArgs - 1, std::tuple<Args...>>::type LastArgType;
    bool hasCallback = std::is_same<std::function<void(const Variant&)>, typename std::decay<LastArgType>::type>::value;

    if (numArgs > 0 && hasCallback) {
        // 마지막 인자가 std::function인 경우
        //auto argumentsTuple = std::tuple<Args...>(args...);
        //auto resultCallback = std::get<numArgs - 1>(argumentsTuple);
        auto resultCallback = std::get<sizeof...(Args) - 1>(std::tuple<Args...>(args...));
        // 인자 처리 (예: std::vector로 변환)
        std::vector<Variant> arguments = { static_cast<Variant>(args)... };

        Variant result = 42; // 호출 결과 예시

        // 콜백 호출
        resultCallback(result);
    } else {
        // 마지막 인자가 std::function이 아닌 경우 처리
        std::cout << "Function called without a result callback." << std::endl;
    }
}

// 사용 예시
int main() {
    runJavaScript("myFunction", 1, 2, 3, [](const Variant& result) {
        std::cout << "Result: " << result << std::endl;
    });

    runJavaScript("myFunction", 1, 2, 3); // 콜백 없이 호출

    return 0;
}

if(resultCallback)
    execute(callbackId,resultcallback)
else
 AsyncCondition condition;
 condition.wait(); 
