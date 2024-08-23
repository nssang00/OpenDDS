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
