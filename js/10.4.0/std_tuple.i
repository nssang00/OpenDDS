%{
#include <tuple>
#include <string>
%}

/* 
 * C#에서 Item1, Item2, Item3 속성처럼 보이게 만들기
 * (get0(), get1(), get2() 함수에 연결)
 */
%typemap(cscode) std::tuple<T1, T2, T3> %{
    public $typemap(cstype) Item1 { get { return get0(); } }
    public $typemap(cstype) Item2 { get { return get1(); } }
    public $typemap(cstype) Item3 { get { return get2(); } }
%}

/* 
 * 3개 타입 고정 tuple 정의
 * - std::tuple<T1, T2, T3>을 상속
 * - get0(), set0(), get1(), set1(), get2(), set2() 제공
 */
namespace std {

template<typename T1, typename T2, typename T3>
struct tuple : public std::tuple<T1, T2, T3> {
    // 기본 생성자
    tuple()
        : std::tuple<T1, T2, T3>() {}

    // 값 3개를 초기화하는 생성자
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
