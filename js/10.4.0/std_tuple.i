%module example

%{
#include <tuple>
#include <string>
%}

/* ★ 여기에만 tuple_wrapper 정의 (1번만) */
%inline %{
#include <tuple>
#include <string>

namespace std {

template<typename T1, typename T2, typename T3>
struct tuple_wrapper {
private:
    std::tuple<T1, T2, T3> data;

public:
    tuple_wrapper()
        : data() {}

    tuple_wrapper(const T1& v1, const T2& v2, const T3& v3)
        : data(v1, v2, v3) {}

    T1 get0() const { return std::get<0>(data); }
    T2 get1() const { return std::get<1>(data); }
    T3 get2() const { return std::get<2>(data); }

    void set0(const T1& v) { std::get<0>(data) = v; }
    void set1(const T2& v) { std::get<1>(data) = v; }
    void set2(const T3& v) { std::get<2>(data) = v; }
};

}
%}

/* 타입 인스턴스 명시 */
%template(MyTuple) std::tuple_wrapper<int, double, std::string>;

/* C# Item1/Item2/Item3 속성 매핑 */
%typemap(cscode) MyTuple %{
    public int Item1 { get { return get0(); } set { set0(value); } }
    public double Item2 { get { return get1(); } set { set1(value); } }
    public string Item3 { get { return get2(); } set { set2(value); } }
%}
