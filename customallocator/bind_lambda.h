class SpeedTest {
    uint32_t sum = 0;
    uint8_t i = 0;
    void SumDataBlock(int a, int b) {
        auto lambda = [=](){
            SumDataBlock(a, b);
        };
    }
public:
};

template <typename Func, typename... Args>
class bind_t {
    Func func;          // 원본 함수
    std::tuple<Args...> args; // 전달받은 인자들을 저장

public:
    bind_t(Func f, Args... a) : func(f), args(a...) {}

    template <typename... CallArgs>
    auto operator()(CallArgs&&... callArgs) {
        return call_with_args(std::index_sequence_for<Args...>{}, std::forward<CallArgs>(callArgs)...);
    }

private:
    template <size_t... Is, typename... CallArgs>
    auto call_with_args(std::index_sequence<Is...>, CallArgs&&... callArgs) {
        return func(resolve_arg<Is>(std::forward<CallArgs>(callArgs)...)...);
    }

    template <size_t I, typename... CallArgs>
    auto resolve_arg(CallArgs&&... callArgs) {
        // args에 저장된 각 인자를 평가. 자리표시자는 전달된 인자를 사용.
        return std::get<I>(args)(std::forward<CallArgs>(callArgs)...);
    }
};


/////?
#include <functional>
#include <tuple>

namespace simple_std {

// 플레이스홀더 타입
template <int N>
struct placeholder {};

// 바인드 구현
template <typename F, typename... Args>
class bind_t {
    F f;
    std::tuple<Args...> args;

public:
    bind_t(F f, Args... args) : f(f), args(std::make_tuple(args...)) {}

    template <typename... CallArgs>
    auto operator()(CallArgs&&... call_args) {
        return call(std::index_sequence_for<Args...>{}, 
                    std::forward<CallArgs>(call_args)...);
    }

private:
    template <std::size_t... Is, typename... CallArgs>
    auto call(std::index_sequence<Is...>, CallArgs&&... call_args) {
        return f(get_arg<Is>(std::forward<CallArgs>(call_args)...)...);
    }

    template <std::size_t I, typename... CallArgs>
    auto get_arg(CallArgs&&... call_args) {
        if constexpr (std::is_same_v<std::tuple_element_t<I, std::tuple<Args...>>, placeholder<1>>) {
            return std::get<0>(std::forward_as_tuple(call_args...));
        } else {
            return std::get<I>(args);
        }
    }
};

// bind 함수
template <typename F, typename... Args>
auto bind(F&& f, Args&&... args) {
    return bind_t<F, Args...>(std::forward<F>(f), std::forward<Args>(args)...);
}

} // namespace simple_std

// 사용 예시
#include <iostream>

int add(int a, int b) {
    return a + b;
}

int main() {
    auto bound = simple_std::bind(add, 5, simple_std::placeholder<1>{});
    std::cout << bound(10) << std::endl; // 출력: 15
    return 0;
}
