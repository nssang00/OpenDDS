/* ---------------------------------------------------------------------------
 * std_tuple.i  ―  std::tuple<T1,T2,T3> ↔ MyTuple (C#) with Item1/2/3
 *---------------------------------------------------------------------------*/
%{
#include <tuple>
%}

%define SWIG_STD_TUPLE3_INTERNAL(T1,T2,T3)

%typemap(csinterfaces) std::tuple<T1,T2,T3> "global::System.IDisposable"

%proxycode %{
  /* ctor → native tuple */
  public $csclassname($typemap(cstype,T1) val1,
                      $typemap(cstype,T2) val2,
                      $typemap(cstype,T3) val3)
      : this(__NativeNew(val1, val2, val3), true) { }

  public $typemap(cstype,T1) Item1 { get { return getItem1(); } }
  public $typemap(cstype,T2) Item2 { get { return getItem2(); } }
  public $typemap(cstype,T3) Item3 { get { return getItem3(); } }

  /* Deconstruct (C# 7+) */
  public void Deconstruct(out $typemap(cstype,T1) val1,
                          out $typemap(cstype,T2) val2,
                          out $typemap(cstype,T3) val3)
  { val1 = Item1; val2 = Item2; val3 = Item3; }
%}

%rename(getItem1) getItem1;
%rename(getItem2) getItem2;
%rename(getItem3) getItem3;

%csmethodmodifiers __NativeNew "private"
%csmethodmodifiers getItem1   "private"
%csmethodmodifiers getItem2   "private"
%csmethodmodifiers getItem3   "private"

/* ---------- 네이티브 확장 ---------- */
public:
  typedef std::tuple<T1,T2,T3> self_type;

  self_type();
  self_type(const self_type&);
  self_type(const T1&, const T2&, const T3&);

  %extend {
    static self_type *__NativeNew(const T1& val1,
                                  const T2& val2,
                                  const T3& val3)
    { return new self_type(val1, val2, val3); }

    const T1& getItem1() const { return std::get<0>(*($self)); }
    const T2& getItem2() const { return std::get<1>(*($self)); }
    const T3& getItem3() const { return std::get<2>(*($self)); }
  }

%enddef  /* SWIG_STD_TUPLE3_INTERNAL */

/*---------------------------------------------------------------------------
 * SWIG용 더미 선언 – 실제 <tuple> 정의와 충돌 없음
 *---------------------------------------------------------------------------*/
namespace std {
  template<class T1,class T2,class T3>
  class tuple {
    SWIG_STD_TUPLE3_INTERNAL(T1,T2,T3)
  };
}
