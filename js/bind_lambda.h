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
