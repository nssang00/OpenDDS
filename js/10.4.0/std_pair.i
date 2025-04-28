%{
#include <tuple>
#include <string>
%}

namespace std {

// 3개 타입 고정 tuple 정의
template<typename T1, typename T2, typename T3>
struct tuple : public std::tuple<T1, T2, T3> {
    // 기본 생성자
    tuple()
        : std::tuple<T1, T2, T3>() {}

    // 초기값 3개를 받는 생성자
    tuple(const T1& v1, const T2& v2, const T3& v3)
        : std::tuple<T1, T2, T3>(v1, v2, v3) {}

    // Getter
    T1 get0() const { return std::get<0>(*this); }
    T2 get1() const { return std::get<1>(*this); }
    T3 get2() const { return std::get<2>(*this); }

    // Setter
    void set0(const T1& v) { std::get<0>(*this) = v; }
    void set1(const T2& v) { std::get<1>(*this) = v; }
    void set2(const T3& v) { std::get<2>(*this) = v; }
};

}
