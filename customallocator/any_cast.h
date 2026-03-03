template <typename ValueType>
ValueType AnyCast(Any& operand)
{
    typedef typename TypeWrapper< ValueType >::TYPE NonRef;

    NonRef* result = AnyCast<NonRef>(&operand);
    if (!result)
    {
        // int -> double 자동 변환
        if (typeid(NonRef) == typeid(double) && operand.type() == typeid(int))
        {
            int* intVal = AnyCast<int>(&operand);
            operand = static_cast<double>(*intVal); // Any를 double로 재저장
            return *AnyCast<NonRef>(&operand);
        }

        std::string s = "RefAnyCast: Failed to convert between Any types ";
        if (!operand.empty())
        {
            s.append(1, '(');
            s.append(operand.type().name());
            s.append(" => ");
            s.append(typeid(ValueType).name());
            s.append(1, ')');
        }
        throw std::runtime_error(s);
    }		
    return *result;
}
/////

template <>
double AnyCast<double>(Any& operand)
{
    // double이면 그대로 반환
    if (double* p = AnyCast<double>(&operand))
        return *p;

    // int면 double로 캐스팅
    if (int* p = AnyCast<int>(&operand))
        return static_cast<double>(*p);

    std::string s = "RefAnyCast: Failed to convert between Any types ";
    if (!operand.empty())
    {
        s.append(1, '(');
        s.append(operand.type().name());
        s.append(" => double)");
    }
    throw std::runtime_error(s);
}

///////
template <typename TargetType>
bool tryNumericCast(Any& operand, TargetType& out)
{
    if (!std::is_arithmetic<TargetType>::value) return false;

    const std::type_info& t = operand.type();
    if      (t == typeid(int))    { out = static_cast<TargetType>(static_cast<int>(operand));    return true; }
    else if (t == typeid(double)) { out = static_cast<TargetType>(static_cast<double>(operand)); return true; }
    else if (t == typeid(float))  { out = static_cast<TargetType>(static_cast<float>(operand));  return true; }
    else if (t == typeid(bool))   { out = static_cast<TargetType>(static_cast<bool>(operand));   return true; }
    return false;
}

template <typename ValueType>
ValueType AnyCast(Any& operand)
{
    typedef typename TypeWrapper<ValueType>::TYPE NonRef;

    NonRef* result = AnyCast<NonRef>(&operand);
    if (!result)
    {
        // 숫자 타입 간 자동 변환 시도
        NonRef numericResult{};
        if (tryNumericCast(operand, numericResult))
            return numericResult;

        std::string s = "RefAnyCast: Failed to convert between Any types ";
        if (!operand.empty())
        {
            s.append(1, '(');
            s.append(operand.type().name());
            s.append(" => ");
            s.append(typeid(ValueType).name());
            s.append(1, ')');
        }
        throw std::runtime_error(s);
    }
    return *result;
}

/////////////
#include <type_traits>   // C++11에 std::is_same, std::decay 존재
#include "Poco/Any.h"    // 또는 당신의 Any 헤더

template <typename ValueType>
ValueType AnyCast(Any& operand)
{
    // C++11에서는 std::decay_t 대신 std::decay::type 사용
    typedef typename std::decay<ValueType>::type Decayed;

    // 1. 정확한 타입 매칭 먼저 시도
    Decayed* ptr = AnyCast<Decayed>(&operand);
    if (ptr)
    {
        return *ptr;
    }

    // 2. double 요청 시 int → double 변환 지원
    // C++11에서는 if constexpr 대신 일반 if + 템플릿 특수화/조건 활용
    if (std::is_same<Decayed, double>::value)
    {
        int* ip = AnyCast<int>(&operand);
        if (ip)
        {
            double value = static_cast<double>(*ip);
            return value;   // ValueType이 double 이므로 안전
        }
    }

    throw Poco::BadCastException("Failed to convert between Any types");
}
///////
#include <type_traits>   // std::decay_t, std::is_reference_v 등

template <typename ValueType>
ValueType AnyCast(Any& operand)
{
    using Decayed = std::decay_t<ValueType>;

    // 1. 정확한 타입 매칭 시도
    Decayed* ptr = AnyCast<Decayed>(&operand);
    if (ptr)
    {
        if constexpr (std::is_reference_v<ValueType>)
            return *ptr;           // 참조 타입이면 참조 반환
        else
            return *ptr;           // 값 타입이면 복사 반환
    }

    // 2. double 요청 시 int → double 변환
    if constexpr (std::is_same_v<Decayed, double>)
    {
        if (int* p = AnyCast<int>(&operand))
        {
            double value = static_cast<double>(*p);

            if constexpr (std::is_reference_v<ValueType>)
            {
                // 참조 타입으로는 임시 객체를 바인딩할 수 없음 → 에러 방지
                static_assert(false, "Cannot bind reference to converted temporary (int -> double)");
                // 또는 throw 해도 되지만, 컴파일 타임에 막는 게 더 좋음
            }
            else
            {
                return static_cast<ValueType>(value);
            }
        }
    }

    throw Poco::BadCastException("Failed to convert between Any types");
}
////
#include <type_traits>

template <typename ValueType>
ValueType AnyCast(Any& operand)
{
    using Target = std::decay_t<ValueType>;

    Target* result = AnyCast<Target>(&operand);
    if (result) return *result;

    if constexpr (std::is_same_v<Target, double>) {
        if (int* p = AnyCast<int>(&operand)) {
            return static_cast<ValueType>(static_cast<double>(*p));
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
