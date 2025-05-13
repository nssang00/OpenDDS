/* ───────────────────────────────────────────────────────────────
 * SWIG_STD_TUPLE3_TYPE(alias , T1 , T2 , T3)
 *   - alias   : C++/C# 에서 모두 사용할 새 typedef 이름
 *   - T1~T3   : 튜플 원소 타입
 * ─────────────────────────────────────────────────────────────── */
%define SWIG_STD_TUPLE3_TYPE(ALIAS, T1, T2, T3)
  /* 1) C++에 typedef 삽입 (SWIG이 생성하는 wrapper 헤더에도 들어감) */
  %{
    typedef std::tuple< T1, T2, T3 > ALIAS;
  %}

  /* 2) 기본 3-원소 튜플 typemap 재사용 */
  SWIG_STD_TUPLE3(T1, T2, T3)

  /* 3) 이 typedef 를 tuple 과 동일하게 취급하도록 연결 */
  %apply std::tuple< T1, T2, T3 > { ALIAS };

  /* 4) 서명에 ‘ALIAS’ 라는 이름이 그대로 보이도록 C# 측 typemap 재정의 */
  %typemap(cstype) ALIAS "ALIAS"
  %typemap(csin)   ALIAS "ALIAS $csinput"
  %typemap(csout)  ALIAS "$csinput"

  /* 5) C# 코드에 얇은 래퍼 클래스를 자동 생성 (System.Tuple 상속) */
  %typemap(csbody) ALIAS %{
    public class ALIAS :
      System.Tuple<$typemap(cstype,T1), $typemap(cstype,T2), $typemap(cstype,T3)>
    {
      public ALIAS($typemap(cstype,T1) item1,
                   $typemap(cstype,T2) item2,
                   $typemap(cstype,T3) item3)
        : base(item1, item2, item3) { }
    }
  %}
%enddef
