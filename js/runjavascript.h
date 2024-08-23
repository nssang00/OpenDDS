#include <iostream>
#include <string>
#include <functional>
#include <variant>
#include <vector>

// Variant 타입 정의 (C++17 이상)
using Variant = std::variant<int, double, std::string>; // 필요한 타입에 따라 추가 가능

// 가변 인자를 받는 runJavaScript 함수
template<typename... Args>
void runJavaScript(const std::string& name, Args... args, const std::function<void(const Variant&)>& resultCallback = {}) {
    // JavaScript 함수 호출을 위한 로직 구현
    std::cout << "Calling JavaScript function: " << name << std::endl;

    // 인자 처리 (예: std::vector로 변환)
    std::vector<Variant> arguments = { static_cast<Variant>(args)... };

    // 여기에 JavaScript 호출 로직을 추가해야 함

    // 가상의 결과 생성
    Variant result = "Result from " + name; // 예시 결과

    // 결과 콜백이 등록된 경우 호출
    if (resultCallback) {
        resultCallback(result);
    }
}

// 사용 예시
int main() {
    runJavaScript("myFunction", 42, 3.14, "Hello", [](const Variant& result) {
        std::visit([](auto&& arg) {
            std::cout << "Callback received result: " << arg << std::endl;
        }, result);
    });

    return 0;
}

/////
#include <iostream>
#include <functional>
#include <string>
#include <variant>

// Variant 타입 정의 (여기서는 std::variant를 사용)
using Variant = std::variant<int, double, std::string>; // 필요한 타입에 맞게 추가

// 가변 인자 함수 정의
template<typename... Args>
void runJavaScript(const std::string& name, Args... args, const std::function<void(const Variant&)>& resultCallback = {}) {
    // JavaScript 함수 호출 로직 (예제에서 생략)
    std::cout << "Calling JavaScript function: " << name << std::endl;

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
        std::visit([](auto&& arg) {
            std::cout << "Result: " << arg << std::endl;
        }, result);
    });

    return 0;
}

/////
#include <iostream>
#include <functional>
#include <string>
#include <tuple>

// Variant 클래스의 간단한 예시 (실제 구현은 필요에 따라 다를 수 있음)
class Variant {
public:
    explicit Variant(const std::string& value) : value(value) {}
    std::string toString() const { return value; }
private:
    std::string value;
};

// 가변 인자를 처리하기 위한 헬퍼 함수
template<typename... Args>
void runJavaScriptImpl(const std::string& name, const std::function<void(const Variant&)>& resultCallback, Args... args) {
    // 인자 처리 및 JavaScript 실행 로직을 여기에 추가합니다.
    // 예시로, 함수 이름과 인자들을 출력합니다.
    std::cout << "Function Name: " << name << std::endl;

    // 인자 출력
    (std::cout << ... << args) << std::endl;

    // 콜백을 사용하여 결과 반환
    Variant result("Execution Result");
    resultCallback(result);
}

// 가변 인자를 처리하는 public 함수
template<typename... Args>
void runJavaScript(const std::string& name, Args... args) {
    // 마지막 인자가 std::function인지 확인
    if constexpr (sizeof...(args) > 0) {
        runJavaScriptImpl(name, std::get<sizeof...(args) - 1>(std::tuple<Args...>(args...)), std::get<sizeof...(args) - 2>(std::tuple<Args...>(args...)));
    }
}

int main() {
    // 사용 예시
    runJavaScript("exampleFunction", 42, "argument", [](const Variant& result) {
        std::cout << "Callback Result: " << result.toString() << std::endl;
    });

    return 0;
}
