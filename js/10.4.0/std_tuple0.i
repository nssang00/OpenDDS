/* ============================================================================
 *  std_tuple.i  ―  Generic 3-element std::tuple  ⇄  System.Tuple  for SWIG/C#
 *  ----------------------------------------------------------------------------
 *  사용 예
 *  -------
 *    %include "std_tuple.i"
 *
 *    /* C++: std::tuple<int,double,std::string>
 *       C# : System.Tuple<int,double,string>       * /
 *    SWIG_STD_TUPLE3(int,double,std::string,
 *                    int,double,string,
 *                    ObjectPoseInfo)
 *
 *    %include "example.h"
 *
 *  ➜  make_tuple() 반환값은 proxy 객체이지만 .ToTuple() 으로
 *      System.Tuple 형식으로 쉽게 변환할 수 있고,
 *      C# → C++ 호출 시에는 System.Tuple 을 그대로 넘기면 됩니다.
 *
 *  매크로 인수
 *  ----------
 *      T1,T2,T3  …  C++ 원소 타입
 *      CS1,CS2,CS3…  대응되는 C# 타입 이름(문자열)
 *      NAME       …  %template 별칭(고유해야 함)
 * ========================================================================== */

 %{
    #include <tuple>
    %}
    
    /* SWIG 에게 “3-원소 std::tuple 템플릿이 존재한다” 고 알림 */
    %inline %{
    namespace std { template<class A,class B,class C> class tuple; }
    %}
    
    /* ------------------------------------------------------------------------- */
    /*                              매크로 정의                                   */
    /* ------------------------------------------------------------------------- */
    %define SWIG_STD_TUPLE3(T1, T2, T3,  CS1, CS2, CS3,  NAME)
    
    /* 1) C# 시그니처 형식 지정 */
      %typemap(cstype) std::tuple< T1, T2, T3 > "System.Tuple<"CS1","CS2","CS3">"
    
    /* 2) C# ➜ C++ 변환 (System.Tuple → std::tuple) */
      %typemap(csin)   std::tuple< T1, T2, T3 > {
        $1 = std::make_tuple($input.Item1, $input.Item2, $input.Item3);
      }
    
    /* 3) C# proxy 클래스에 ToTuple() 주입 */
      %typemap(cscode) std::tuple< T1, T2, T3 > %{
        public System.Tuple<CS1,CS2,CS3> ToTuple() {
          return System.Tuple.Create(
            global::$imclassname.NAME_get0(this),
            global::$imclassname.NAME_get1(this),
            global::$imclassname.NAME_get2(this));
        }
      %}
    
    /* 4) helper native 함수 3개 (get0/1/2) */
      %inline %{
        static inline T1 NAME_get0(const std::tuple<T1,T2,T3>& t) { return std::get<0>(t); }
        static inline T2 NAME_get1(const std::tuple<T1,T2,T3>& t) { return std::get<1>(t); }
        static inline T3 NAME_get2(const std::tuple<T1,T2,T3>& t) { return std::get<2>(t); }
      %}
    
    /* 5) 실제 템플릿 인스턴스화 */
      %template(NAME) std::tuple< T1, T2, T3 >;
    
    %enddef
    
