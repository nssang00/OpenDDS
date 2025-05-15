/* ---------------------------------------------------------------------------
 * std_tuple.i  ―  std::tuple<T1,T2,T3> ↔ MyTuple (C#)
 *  - implicit operator 제거
 *  - getItem1/2/3 이름 사용
 *  - self_type typedef 삭제, new std::tuple<...> 직접 호출
 *---------------------------------------------------------------------------*/
%{
#include <tuple>
%}

/*---------------------------------------------------------------------------
 * 매크로 : 3-원소 tuple 래퍼
 *---------------------------------------------------------------------------*/
%define SWIG_STD_TUPLE3_INTERNAL(T1,T2,T3)

/* ---------- C# 측에서 구현할 인터페이스만 지정 ---------- */
%typemap(csinterfaces) std::tuple<T1,T2,T3> "global::System.IDisposable"

/* ---------- C# 프록시 코드 ---------- */
%proxycode %{
  /* ctor → native tuple 생성 */
  public $csclassname($typemap(cstype,T1) val1,
                      $typemap(cstype,T2) val2,
                      $typemap(cstype,T3) val3)
      : this(__NativeNew(val1, val2, val3), true) { }

  public $typemap(cstype,T1) Item1 { get { return getItem1(); } }
  public $typemap(cstype,T2) Item2 { get { return getItem2(); } }
  public $typemap(cstype,T3) Item3 { get { return getItem3(); } }

  public void Deconstruct(out $typemap(cstype,T1) val1,
                          out $typemap(cstype,T2) val2,
                          out $typemap(cstype,T3) val3)
  { val1 = Item1; val2 = Item2; val3 = Item3; }
%}

/* ---------- 내부 멤버 이름·가시성 ---------- */
%rename(getItem1) getItem1;
%rename(getItem2) getItem2;
%rename(getItem3) getItem3;

%csmethodmodifiers __NativeNew "private"
%csmethodmodifiers getItem1   "private"
%csmethodmodifiers getItem2   "private"
%csmethodmodifiers getItem3   "private"

/* ---------- 네이티브 확장 ---------- */
public:

  /* 기본·복사·값 생성자 선언 */
  tuple();
  tuple(const tuple&);
  tuple(const T1&, const T2&, const T3&);

  %extend {
    static std::tuple<T1,T2,T3>* __NativeNew(const T1& val1,
                                             const T2& val2,
                                             const T3& val3)
    { return new std::tuple<T1,T2,T3>(val1, val2, val3); }

    const T1& getItem1() const { return std::get<0>(*($self)); }
    const T2& getItem2() const { return std::get<1>(*($self)); }
    const T3& getItem3() const { return std::get<2>(*($self)); }
  }

%enddef  /* SWIG_STD_TUPLE3_INTERNAL */

/*---------------------------------------------------------------------------
 * SWIG 전용 더미 선언 – 실제 <tuple> 정의와 충돌 없음
 *---------------------------------------------------------------------------*/
namespace std {
  template<class T1,class T2,class T3>
  class tuple {
    SWIG_STD_TUPLE3_INTERNAL(T1,T2,T3)
  };
}
