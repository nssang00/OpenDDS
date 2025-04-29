%module example

/* ---------- ① C++ 컴파일러용 ---------- */
%{
#include <tuple>
#include <string>
#include "example.h"                // callTuple / typedef MyTuple

/* tuple_wrapper 정의 */
namespace std {
template<typename T1, typename T2, typename T3>
struct tuple_wrapper {
private:
    std::tuple<T1,T2,T3> data;
public:
    tuple_wrapper() : data() {}
    tuple_wrapper(const T1& a,const T2& b,const T3& c):data(a,b,c){}
    T1 get0() const { return std::get<0>(data);}  void set0(const T1& v){std::get<0>(data)=v;}
    T2 get1() const { return std::get<1>(data);}  void set1(const T2& v){std::get<1>(data)=v;}
    T3 get2() const { return std::get<2>(data);}  void set2(const T3& v){std::get<2>(data)=v;}
};
}
%}

/* ---------- ② SWIG 파서용 ---------- */

/* 1.  typedef MyTuple → wrapper 타입으로 재매핑 */
%rename(MyTuple) std::tuple_wrapper<int,double,std::string>;

/* 2.  실제 인스턴스 만들기 */
%template(MyTuple) std::tuple_wrapper<int,double,std::string>;

/* 3.  이제 헤더를 SWIG에 읽힘(시그니처 연결) */
%include "example.h"        /* typedef·callTuple 파싱 */

/* 4.  C# 속성 매핑 */
%typemap(cscode) MyTuple %{
    public int    Item1 { get { return get0(); } set { set0(value); } }
    public double Item2 { get { return get1(); } set { set1(value); } }
    public string Item3 { get { return get2(); } set { set2(value); } }
%}
