%{
#include <tuple>
%}

/* ───────────────────────────────────────────────
 * 3-원소 std::tuple<T1, T2, T3> 매핑 (read-only)
 * - C#에선 MyTuple : System.Tuple<T1,T2,T3>
 * - 생성자에서 값만 설정
 * - Item1/2/3 getter만 사용
 * ─────────────────────────────────────────────── */
%define SWIG_STD_TUPLE3_SIMPLE(T1, T2, T3)

/* IDisposable 인터페이스 (일관성) */
%typemap(csinterfaces) std::tuple<T1, T2, T3> "System.IDisposable"

/* C#에 노출될 타입 이름 (예: MyTuple) */
%typemap(cstype) std::tuple<T1, T2, T3> "$csclassname"

/* C#에서 인자로 전달되는 타입 */
%typemap(csin) std::tuple<T1, T2, T3> "$csclassname $csinput"

/* C# 프록시 클래스가 상속할 기본 타입 지정 */
%typemap(csbase) std::tuple<T1, T2, T3> \
"System.Tuple<$typemap(cstype,T1), $typemap(cstype,T2), $typemap(cstype,T3)>"

/* C# 생성자 정의 (base(...) 호출) */
%typemap(csbody) std::tuple<T1, T2, T3> %{
  public $csclassname($typemap(cstype,T1) item1,
                      $typemap(cstype,T2) item2,
                      $typemap(cstype,T3) item3)
      : base(item1, item2, item3) { }
%}

/* C# → C++ 변환 (System.Tuple → std::tuple) */
%typemap(in) std::tuple<T1, T2, T3> {
  if (!$input)
    SWIG_exception_fail(SWIG_ValueError, "tuple argument is null");
  $1 = std::make_tuple($input.Item1, $input.Item2, $input.Item3);
}

/* C++ → C# 변환 (std::tuple → System.Tuple 기반 MyTuple) */
%typemap(csout) std::tuple<T1, T2, T3> \
"new $csclassname($imcall.get<0>(), $imcall.get<1>(), $imcall.get<2>())"

%enddef

/* 자동 적용되지 않으므로 %template으로 각 조합을 등록해야 함 */
namespace std {
  template<class T1, class T2, class T3>
  class tuple {
    SWIG_STD_TUPLE3_SIMPLE(T1, T2, T3)
  };
}
