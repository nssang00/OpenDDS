/* -----------------------------------------------------------------------------
 *  std_tuple.i ― std::tuple<T1,T2,T3>  ↔  System.Tuple<T1,T2,T3>
 *
 *  ‣ 3-원소 전용.  (T1,T2,T3 고정 길이)
 *  ‣ C# 쪽 래퍼는  System.Tuple<…> 를 상속하므로 런타임 오버헤드 없음.
 *
 *  사용법
 *  -------
 *    %include "std_tuple.i"
 *    %template(MyTuple)  std::tuple<int,double,std::string>;
 *    %template(MyTuple2) std::tuple<short,int,double>;
 *
 *  참고:  %template 를 선언하지 않은 튜플 타입은 포인터 식별자(SWIGTYPE_…)
 *        로만 노출되니, 필요한 모든 조합을 반드시 %template 해 주세요.
 * --------------------------------------------------------------------------- */

%{
#include <tuple>
%}

/* ---------------------------------------------------------------------------
 *  내부 매크로  (T1, T2, T3 는 자리표시자)
 * ------------------------------------------------------------------------- */
%define SWIG_STD_TUPLE3_INTERNAL(T1, T2, T3)

%typemap(csinterfaces) std::tuple< T1, T2, T3 > \
"global::System.IDisposable"

%typemap(csbase)       std::tuple< T1, T2, T3 > \
"System.Tuple<$typemap(cstype,T1), $typemap(cstype,T2), $typemap(cstype,T3)>"

%typemap(cstype)       std::tuple< T1, T2, T3 > \
"System.Tuple<$typemap(cstype,T1), $typemap(cstype,T2), $typemap(cstype,T3)>"

%typemap(csin)         std::tuple< T1, T2, T3 > \
"System.Tuple<$typemap(cstype,T1), $typemap(cstype,T2), $typemap(cstype,T3)> $csinput"

/* C# → C++ 변환 */
%typemap(in)           std::tuple< T1, T2, T3 > {
  if (!$input)
    SWIG_exception_fail(SWIG_ValueError, "System.Tuple argument is null");
  $1 = std::make_tuple($input->Item1, $input->Item2, $input->Item3);
}

/* C++ → C# 변환 */
%typemap(csout)        std::tuple< T1, T2, T3 > \
"new System.Tuple<$typemap(cstype,T1), $typemap(cstype,T2), $typemap(cstype,T3)>($imcall.get<0>(), $imcall.get<1>(), $imcall.get<2>())"

/* 래퍼 클래스(프록시) 몸체 – 편의 생성자 하나만 추가                     */
%typemap(csbody)       std::tuple< T1, T2, T3 > %{
  public $csclassname($typemap(cstype,T1) item1,
                      $typemap(cstype,T2) item2,
                      $typemap(cstype,T3) item3)
          : base(item1, item2, item3) { }
%}

%enddef   /* ── SWIG_STD_TUPLE3_INTERNAL ─────────────────────────────────── */

/* ---------------------------------------------------------------------------
 *  “디폴트 구현”   (std_unordered_map.i 와 동일한 패턴)
 *    → 실제 STL std::tuple 과는 이름 충돌 없이 SWIG 안에서만 사용
 * ------------------------------------------------------------------------- */
namespace std {
  template <class T1, class T2, class T3>
  class tuple {
    SWIG_STD_TUPLE3_INTERNAL(T1, T2, T3)
  };
}
