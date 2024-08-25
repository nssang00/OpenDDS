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
#include <type_traits>

namespace my_std {

// 함수 호출을 위한 헬퍼 함수
template<typename Func, typename Tuple, std::size_t... I>
auto call_impl(Func&& f, Tuple&& t, std::index_sequence<I...>) {
    return std::forward<Func>(f)(std::get<I>(std::forward<Tuple>(t))...);
}

template<typename Func, typename Tuple>
auto call(Func&& f, Tuple&& t) {
    constexpr auto size = std::tuple_size<std::decay_t<Tuple>>::value;
    return call_impl(std::forward<Func>(f), std::forward<Tuple>(t),
                     std::make_index_sequence<size>{});
}

// placeholder 타입
template<int>
struct placeholder {};

// 실제 바인드 구현
template<typename F, typename... Args>
class binder {
    F f;
    std::tuple<Args...> args;

public:
    binder(F&& f, Args&&... args)
        : f(std::forward<F>(f)), args(std::forward<Args>(args)...) {}

    template<typename... CallArgs>
    auto operator()(CallArgs&&... call_args) {
        auto bound_args = std::tuple_cat(
            args,
            std::forward_as_tuple(std::forward<CallArgs>(call_args)...)
        );
        return call(f, bound_args);
    }
};

// bind 함수
template<typename F, typename... Args>
auto bind(F&& f, Args&&... args) {
    return binder<std::decay_t<F>, std::decay_t<Args>...>(
        std::forward<F>(f), std::forward<Args>(args)...
    );
}

} // namespace my_std

int add(int a, int b) {
    return a + b;
}

int main() {
    auto bound = my_std::bind(add, 5, my_std::placeholder<1>{});
    std::cout << bound(10) << std::endl; // 출력: 15
    return 0;
}
