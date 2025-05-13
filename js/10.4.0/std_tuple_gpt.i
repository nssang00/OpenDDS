/* ---------------------------------------------------------------------------
 *  std_tuple.i     ―  std::tuple<T1,T2,T3>  ↔  System.Tuple<T1,T2,T3>
 *                    (3-원소 전용, C# 타깃)
 *
 *  사용 예
 *  -------
 *    %include "std_tuple.i"
 *    %template(MyTuple)  std::tuple<int,double,std::string>;
 *    %template(MyTuple2) std::tuple<short,int,double>;
 *
 *    // C++ 코드에서 std::tuple<int,double,std::string> 을 사용하든,
 *    // typedef  ObjectInfo = std::tuple<int,double,std::string>;
 *    // 로 쓰든, C# 측 시그니처는 전부 MyTuple 로 보입니다.
 * ------------------------------------------------------------------------- */

%{
#include <tuple>      /* native 헤더: SWIG wrapper 쪽에서 필요             */
%}

%include <typemaps.i> /* SWIG 표준 typemap – 이미 포함돼 있으면 생략 가능 */

/* ────────────────────────────────────────────────────────────────────────── */
/*  아래 typemap들은 “템플릿 패턴”으로 정의됩니다.                          */
/*  std::tuple< T1 , T2 , T3 > 형태라면 T1~T3 가 무엇이든 자동 적용됩니다.  */
/* ────────────────────────────────────────────────────────────────────────── */

/* 1) C# 쪽 타입 이름 (메서드 시그니처)  */
%typemap(cstype) std::tuple< T1, T2, T3 >                       \
"System.Tuple<$typemap(cstype,T1), $typemap(cstype,T2), $typemap(cstype,T3)>"

/* 2) C# → C++ 파라미터(값) 전달용 – 시그니처에 그대로 튜플 클래스를 사용 */
%typemap(csin)   std::tuple< T1, T2, T3 >                       \
"System.Tuple<$typemap(cstype,T1), $typemap(cstype,T2), $typemap(cstype,T3)> $csinput"

/* 3) C# → C++ 실제 변환 (Tuple → std::tuple) */
%typemap(in)     std::tuple< T1, T2, T3 > {
  if (!$input) {
    SWIG_exception_fail(SWIG_ValueError, "System.Tuple argument is null");
  }
  $1 = std::make_tuple($input->Item1, $input->Item2, $input->Item3);
}

/* 4) C++ → C# 반환값 변환 (std::tuple → Tuple) */
%typemap(csout)  std::tuple< T1, T2, T3 >                       \
"new System.Tuple<$typemap(cstype,T1), $typemap(cstype,T2), $typemap(cstype,T3)>($imcall.get<0>(), $imcall.get<1>(), $imcall.get<2>())"

/* 5) 래핑 클래스가 상속할 .NET 기반 클래스 지정                            */
%typemap(csbase) std::tuple< T1, T2, T3 >                       \
"System.Tuple<$typemap(cstype,T1), $typemap(cstype,T2), $typemap(cstype,T3)>"

/* 6) 래핑 클래스 본문에 기본 생성자 추가 (값 전달만)                        */
%typemap(csbody) std::tuple< T1, T2, T3 > %{
  public $csclassname($typemap(cstype,T1) item1,
                      $typemap(cstype,T2) item2,
                      $typemap(cstype,T3) item3)
        : base(item1, item2, item3) { }
%}

/* 7) 디렉터용 – 별도 변환 없이 그대로 전달                                   */
%typemap(csdirectorin)  std::tuple< T1, T2, T3 > "$input"
%typemap(csdirectorout) std::tuple< T1, T2, T3 > "$input"

/* 끝 --------------------------------------------------------------------- */
