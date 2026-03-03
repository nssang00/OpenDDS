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

// 기본 - 변환 불가
template <typename To>
struct NumericAnyCaster {
    static To cast(Any& operand) {
        throw BadCastException("Failed to convert between Any types");
    }
};

// double 전용 특수화
template <>
struct NumericAnyCaster<double> {
    static double cast(Any& operand) {
        int* p = AnyCast<int>(&operand);
        if (p) return static_cast<double>(*p);
        throw BadCastException("Failed to convert between Any types");
    }
};

template <typename ValueType>
ValueType AnyCast(Any& operand)
{
    typedef typename TypeWrapper<ValueType>::TYPE NonRef;

    NonRef* result = AnyCast<NonRef>(&operand);
    if (result) return *result;

    // 구조체 특수화로 위임
    return NumericAnyCaster<NonRef>::cast(operand);
}
