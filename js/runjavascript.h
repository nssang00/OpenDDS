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
        auto resultCallback = std::get<sizeof...(Args) - 1>(std::forward_as_tuple(args...));
        
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
/////

void processArgs(const std::vector<Variant>& args) {
    std::function<void(const Variant&)> resultCallback;

    if (!args.empty()) {
        const std::any& lastArg = args.back();
        if (lastArg.type() == typeid(std::function<void(const Variant&)>)) {
            resultCallback = std::any_cast<const std::function<void(const Variant&)>&>(lastArg);
        }
    }

    if (resultCallback) {
        Variant variant = 42;
        resultCallback(variant);
    }
}

auto lastArg = std::any_cast<std::function<void(const Variant&)>>(&arguments.back());
        
        if (lastArg) {
            // 마지막 인자가 std::function<void(const Variant&)> 타입일 경우
            resultCallback = *lastArg;
            arguments.pop_back();
//////

if(resultCallback)
    execute(callbackId,resultcallback)
else
 AsyncCondition condition;
 condition.wait(); 


///////
#include <iostream>
#include <vector>
#include <any>
#include <functional>
#include <typeindex>
#include <typeinfo>

// Variant 클래스 정의 (예시)
class Variant {
public:
    Variant(int value) : value_(value) {}
    friend std::ostream& operator<<(std::ostream& os, const Variant& v) {
        return os << v.value_;
    }
private:
    int value_;
};

// 람다 함수 타입 정의
using LambdaType = std::function<void(const Variant&)>;

// 벡터의 마지막 요소가 LambdaType인지 확인하고 호출하는 함수
void processVector(const std::vector<std::any>& vec) {
    if (vec.empty()) {
        std::cout << "Vector is empty" << std::endl;
        return;
    }

    const std::any& last = vec.back();
    
    // 마지막 요소가 LambdaType인지 확인
    if (last.type() == typeid(LambdaType)) {
        try {
            // LambdaType으로 캐스팅
            const auto& lambda = std::any_cast<const LambdaType&>(last);
            
            // 람다 함수 호출 (여기서는 예시로 Variant(42)를 전달)
            lambda(Variant(42));
        } catch (const std::bad_any_cast& e) {
            std::cout << "Error: " << e.what() << std::endl;
        }
    } else {
        std::cout << "Last element is not a lambda function" << std::endl;
    }
}

int main() {
    std::vector<std::any> vec = {1, "hello", 3.14};
    
    // 람다 함수 추가
    vec.push_back(LambdaType([](const Variant& result) {
        std::cout << "Result: " << result << std::endl;
    }));

    processVector(vec);

    return 0;
}
