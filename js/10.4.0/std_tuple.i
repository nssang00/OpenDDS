%{
#include <tuple>
#include <string>
%}

/*
 * C#에서 Item1, Item2, Item3 속성을 읽고 쓸 수 있도록 만들기
 */
%typemap(cscode) std::tuple_wrapper<T1,T2,T3> %{
    public $typemap(cstype) Item1 { 
        get { return get0(); } 
        set { set0(value); } 
    }
    public $typemap(cstype) Item2 { 
        get { return get1(); } 
        set { set1(value); } 
    }
    public $typemap(cstype) Item3 { 
        get { return get2(); } 
        set { set2(value); } 
    }
%}

/*
 * std::tuple<T1,T2,T3>을 멤버로 가지는 wrapper 구조
 */
namespace std {

template<typename T1, typename T2, typename T3>
struct tuple_wrapper {
    std::tuple<T1, T2, T3> data;  // 구성(composition)

    tuple_wrapper()
        : data() {}

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
