#include <type_traits>   // ← 꼭 추가!

template <typename ValueType>
ValueType AnyCast(Any& operand)
{
    typedef typename TypeWrapper<ValueType>::TYPE NonRef;

    NonRef* result = AnyCast<NonRef>(&operand);
    if (result) {
        return *result;
    }

    if constexpr (std::is_same_v<NonRef, double>)
    {
        if (int* p = AnyCast<int>(&operand))
        {
            return static_cast<double>(*p);
        }
    }

    throw Poco::BadCastException("Failed to convert between Any types");
}

///////
template <typename ValueType>
ValueType AnyCast(Any& operand)
{
    typedef typename TypeWrapper<ValueType>::TYPE NonRef;

    NonRef* result = AnyCast<NonRef>(&operand);
    if (result) return *result;  // ✅ 타입 일치 → 그대로 반환

    // ✅ double 요청인데 int가 저장된 경우 → 자동 변환
    if constexpr (std::is_same_v<NonRef, double>) {
        if (int* p = AnyCast<int>(&operand))
            return static_cast<double>(*p);
    }

    throw BadCastException("Failed to convert between Any types");
}
namespace Poco {

// ✅ 클래스 밖, 네임스페이스 안에 선언
template <typename To>
struct NumericAnyCaster {
    static To cast(Any& operand) {
        throw BadCastException("Failed to convert between Any types");
    }
};

template <>                          // ✅ template<> 명시
struct NumericAnyCaster<double> {
    static double cast(Any& operand) {
        int* p = AnyCast<int>(&operand);
        if (p) return static_cast<double>(*p);
        throw BadCastException("Failed to convert between Any types");
    }
};

// AnyCast도 클래스 밖, 같은 네임스페이스 안
template <typename ValueType>
ValueType AnyCast(Any& operand)
{
    typedef typename TypeWrapper<ValueType>::TYPE NonRef;

    NonRef* result = AnyCast<NonRef>(&operand);
    if (result) return *result;

    return NumericAnyCaster<NonRef>::cast(operand);
}

} // namespace Poco
