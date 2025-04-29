%{
#include <tuple>
#include <string>
%}

/* 
 * 1. std::tuple<T1,T2,T3>을 멤버로 가지는 구조로 만든다 (composition)
 * 2. SWIG에게 노출할 때는 get0()/set0() 식의 메서드 제공
 * 3. 타입은 자유롭게 유지 (T1, T2, T3 고정 아님)
 */
namespace std {

template<typename T1, typename T2, typename T3>
struct tuple_wrapper {
    std::tuple<T1, T2, T3> data;  // ★ 상속이 아니라 멤버로 보유

    // 기본 생성자
    tuple_wrapper()
        : data() {}

    // 값 3개를 초기화하는 생성자
    tuple_wrapper(const T1& v1, const T2& v2, const T3& v3)
        : data(v1, v2, v3) {}

    // Getter
    T1 get0() const { return std::get<0>(data); }
    T2 get1() const { return std::get<1>(data); }
    T3 get2() const { return std::get<2>(data); }

    // Setter
    void set0(const T1& v) { std::get<0>(data) = v; }
    void set1(const T2& v) { std::get<1>(data) = v; }
    void set2(const T3& v) { std::get<2>(data) = v; }
};

}
/////////////
%module example

%include "std_tuple.i"

/* 각각 타입별로 명시적으로 %template 선언 */
%template(MyTuple) std::tuple_wrapper<int, double, std::string>;
%template(AnotherTuple) std::tuple_wrapper<float, int, std::string>;

/* C# 측에 Item1, Item2, Item3 속성 매핑 추가 (타입별로 명시 필요) */
%typemap(cscode) MyTuple %{
    public int Item1 { get { return get0(); } set { set0(value); } }
    public double Item2 { get { return get1(); } set { set1(value); } }
    public string Item3 { get { return get2(); } set { set2(value); } }
%}

%typemap(cscode) AnotherTuple %{
    public float Item1 { get { return get0(); } set { set0(value); } }
    public int Item2 { get { return get1(); } set { set1(value); } }
    public string Item3 { get { return get2(); } set { set2(value); } }
%}
