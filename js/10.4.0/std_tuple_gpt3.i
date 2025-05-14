/* ---------------------------------------------------------------------------
 *  std_tuple.i ― std::tuple<T1,T2,T3>  ↔  C# proxy 클래스
 *                네이티브 객체를 힙에 두고 C# 프록시가 포인터(HandleRef)로 관리
 *                (= std_vector.i 와 동일한 생명주기·API 패턴)
 *
 *  사용법
 *  -------
 *    %include "std_tuple.i"
 *
 *    // 템플릿 인스턴스(포인터형!)를 반드시 선언
 *    %template(MyTuple)  std::tuple<int,double,std::string>*;
 *    %template(PosKey)   std::tuple<Coord3D,Quaternion,int>*;
 *
 *    // 그 뒤로 C++/C# 코드에서 MyTuple* 을 자유롭게 사용
 *
 *  Note
 *  ----
 *    • new MyTuple(a,b,c)  → native new std::tuple<T1,T2,T3>(a,b,c)
 *    • GC/Dispose()        → native delete
 *    • Item1/2/3  getter   → native std::get<N>()
 *    • setter 없음 (불변)
 * ------------------------------------------------------------------------- */

%{
#include <tuple>
%}

/* ---------------------------------------------------------------------------
 *  0. 네이티브 helper 함수 (템플릿 → SWIG이 모노마픽 C-API로 변환)
 * ------------------------------------------------------------------------- */
%inline %{
  template<typename A, typename B, typename C>
  std::tuple<A,B,C>* swig_tuple_new(A a, B b, C c) {
    return new std::tuple<A,B,C>(a,b,c);
  }
  template<typename A, typename B, typename C>
  void swig_tuple_delete(std::tuple<A,B,C>* p) { delete p; }

  template<typename A, typename B, typename C>
  const A& swig_tuple_get0(const std::tuple<A,B,C>* p) { return std::get<0>(*p); }
  template<typename A, typename B, typename C>
  const B& swig_tuple_get1(const std::tuple<A,B,C>* p) { return std::get<1>(*p); }
  template<typename A, typename B, typename C>
  const C& swig_tuple_get2(const std::tuple<A,B,C>* p) { return std::get<2>(*p); }
%}

/* ---------------------------------------------------------------------------
 *  1. proxy/typemap 매크로
 * ------------------------------------------------------------------------- */
%define SWIG_STD_TUPLE3_PTR(T1,T2,T3)

/* C# 타입 표기 */
%typemap(cstype)       std::tuple<T1,T2,T3>* "$csclassname"
%typemap(csinterfaces) std::tuple<T1,T2,T3>* "System.IDisposable"

/* C# → C++ 파라미터 (포인터 그대로 전달) */
%typemap(csin) std::tuple<T1,T2,T3>* "$csclassname $csinput"
%typemap(in)   std::tuple<T1,T2,T3>* "$1 = $input;"

/* C++ → C# 반환값 */
%typemap(csout) std::tuple<T1,T2,T3>* \
"new $csclassname($imcall, true)"

/* 베이스 클래스 지정(없음) */
%typemap(csbase) std::tuple<T1,T2,T3>* "object"

/* proxy 클래스 본체 */
%typemap(csbody) std::tuple<T1,T2,T3>* %{
  private global::System.Runtime.InteropServices.HandleRef swigCPtr;
  protected bool swigCMemOwn;

  internal $csclassname(global::System.IntPtr cPtr, bool cMemoryOwn) {
    swigCPtr = new global::System.Runtime.InteropServices.HandleRef(this, cPtr);
    swigCMemOwn = cMemoryOwn;
  }
  public static global::System.IntPtr getCPtr($csclassname obj) {
    return (obj == null) ? global::System.IntPtr.Zero : obj.swigCPtr.Handle;
  }

  ~$csclassname() { Dispose(); }

  public void Dispose() {
    lock(this) {
      if (swigCPtr.Handle != global::System.IntPtr.Zero) {
        if (swigCMemOwn) {
          swigCMemOwn = false;
          examplePINVOKE.swig_tuple_delete_$csclassname(swigCPtr);
        }
        swigCPtr = new global::System.Runtime.InteropServices.HandleRef(null, global::System.IntPtr.Zero);
      }
      global::System.GC.SuppressFinalize(this);
    }
  }

  /* --- public API ------------------------------------------------------ */
  public $csclassname($typemap(cstype,T1) a,
                      $typemap(cstype,T2) b,
                      $typemap(cstype,T3) c)
      : this(examplePINVOKE.swig_tuple_new_$csclassname(a,b,c), true) { }

  public $typemap(cstype,T1) Item1
      => examplePINVOKE.swig_tuple_get0_$csclassname(swigCPtr);
  public $typemap(cstype,T2) Item2
      => examplePINVOKE.swig_tuple_get1_$csclassname(swigCPtr);
  public $typemap(cstype,T3) Item3
      => examplePINVOKE.swig_tuple_get2_$csclassname(swigCPtr);
%}

%enddef   /* ─────────────────────────────────────────────────────────────── */

/* ---------------------------------------------------------------------------
 *  2. std::tuple 템플릿에 매크로 적용 – SWIG과 C++ 연결 고리
 * ------------------------------------------------------------------------- */
namespace std {
  template<class T1,class T2,class T3>
  class tuple {
    SWIG_STD_TUPLE3_PTR(T1,T2,T3)
  };
}
