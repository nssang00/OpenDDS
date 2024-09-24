#include <iostream>

// 함수 객체를 저장하고 나중에 실행하는 클래스
template<typename Func>
class FunctionHolder {
private:
    Func f;
    int value;

public:
    FunctionHolder(Func f, int value) : f(f), value(value) {}

    void execute() {
        std::cout << "Result: " << f(value) << std::endl;
    }
};

// 함수 객체를 받아 FunctionHolder를 생성하는 함수
template<typename Func>
auto createFunctionHolder(Func f, int value) {
    return FunctionHolder<Func>(f, value);
}

int main() {
    // 람다 함수를 생성하고 저장
    auto holder1 = createFunctionHolder([](int x) { return x * 2; }, 5);
    auto holder2 = createFunctionHolder([](int x) { return x * x; }, 5);

    // 나중에 실행
    holder1.execute();  // 출력: Result: 10
    holder2.execute();  // 출력: Result: 25

    return 0;
}
