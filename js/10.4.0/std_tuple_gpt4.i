/* -----------------------------------------------------------------------------
 *  std_tuple.i — std::tuple<T1,T2,T3>   ↔   C# proxy (HandleRef 소유 + Tuple 상속)
 * ---------------------------------------------------------------------------*/
%{
#include <tuple>
%}

/* --------------------------------------------------------------------------
 * 0. 네이티브 helper (generic) ── SWIG이 각 타입별 wrap → P/Invoke 함수명 생성
 * ------------------------------------------------------------------------*/
%inline %{
  template<class A,class B,class C>
  std::tuple<A,B,C>* swig_tuple_new(A a,B b,C c){
      return new std::tuple<A,B,C>(a,b,c);
  }
  template<class A,class B,class C>
  void swig_tuple_delete(std::tuple<A,B,C>* p){ delete p; }

  template<class A,class B,class C>
  const A& swig_tuple_get0(const std::tuple<A,B,C>* p){ return std::get<0>(*p);}
  template<class A,class B,class C>
  const B& swig_tuple_get1(const std::tuple<A,B,C>* p){ return std::get<1>(*p);}
  template<class A,class B,class C>
  const C& swig_tuple_get2(const std::tuple<A,B,C>* p){ return std::get<2>(*p);}
%}

/* --------------------------------------------------------------------------
 * 1. 매크로:  3-원소 tuple ↔ C# proxy (System.Tuple 상속 + HandleRef)
 * ------------------------------------------------------------------------*/
%define SWIG_STD_TUPLE3_PTR(T1,T2,T3)

/*------------------------------------------------------------------*
 * (A) C# 타입 매핑
 *------------------------------------------------------------------*/
%typemap(cstype)             std::tuple<T1,T2,T3>*  "$csclassname"
%typemap(cstype)       const std::tuple<T1,T2,T3>&  "$csclassname"
%typemap(csinterfaces) std::tuple<T1,T2,T3>*        "System.IDisposable"

/*------------------------------------------------------------------*
 * (B)  C# → C++  (포인터 & const&)
 *------------------------------------------------------------------*/
/* 포인터 그대로 전달 */
%typemap(csin) std::tuple<T1,T2,T3>* "$csclassname $csinput"
%typemap(in)   std::tuple<T1,T2,T3>* "$1 = $input;"

/* const& 인자 : 포인터 역참조하여 값 전달 */
%typemap(csin) const std::tuple<T1,T2,T3>& "$csclassname $csinput"
%typemap(in)   const std::tuple<T1,T2,T3>&
   (std::tuple<T1,T2,T3>* tmp) {
     tmp = $input;
     $1  = *tmp;    /* 복사 → const& */
}

/*------------------------------------------------------------------*
 * (C)  C++ → C#  반환 (포인터)
 *------------------------------------------------------------------*/
%typemap(csout) std::tuple<T1,T2,T3>* \
  "new $csclassname($imcall, false)"   /* false = C++ 측 소유 */

/*------------------------------------------------------------------*
 * (D)  proxy 클래스 베이스  →  System.Tuple<T1,T2,T3>
 *------------------------------------------------------------------*/
%typemap(csbase) std::tuple<T1,T2,T3>* \
  "global::System.Tuple<$typemap(cstype,T1), \
                        $typemap(cstype,T2), \
                        $typemap(cstype,T3)>"

/*------------------------------------------------------------------*
 * (E)  proxy 클래스 본문
 *------------------------------------------------------------------*/
%typemap(csbody) std::tuple<T1,T2,T3>* %{
  private global::System.Runtime.InteropServices.HandleRef swigCPtr;
  protected bool swigCMemOwn;

  /* 내부 생성자 : 네이티브 포인터 → Tuple 필드 채움 */
  internal $csclassname(global::System.IntPtr cPtr, bool own)
    : base(
        $imclassname.swig_tuple_get0_$csclassname(new global::System.Runtime.InteropServices.HandleRef(null, cPtr)),
        $imclassname.swig_tuple_get1_$csclassname(new global::System.Runtime.InteropServices.HandleRef(null, cPtr)),
        $imclassname.swig_tuple_get2_$csclassname(new global::System.Runtime.InteropServices.HandleRef(null, cPtr))
      )
  {
    swigCPtr   = new global::System.Runtime.InteropServices.HandleRef(this, cPtr);
    swigCMemOwn = own;
  }

  /* P/Invoke 클래스 접근 */
  public static global::System.IntPtr getCPtr($csclassname obj) =>
      obj == null ? global::System.IntPtr.Zero : obj.swigCPtr.Handle;

  /* 공개 생성자 : C# 값 → 네이티브 객체 생성 */
  public $csclassname($typemap(cstype,T1) a,
                      $typemap(cstype,T2) b,
                      $typemap(cstype,T3) c)
      : base(a,b,c)
  {
      swigCPtr = new global::System.Runtime.InteropServices.HandleRef(
                    this, $imclassname.swig_tuple_new_$csclassname(a,b,c));
      swigCMemOwn = true;
  }

  /* IDisposable 구현 */
  ~${csclassname}() { Dispose(); }

  public void Dispose() {
    lock(this) {
      if (swigCPtr.Handle != global::System.IntPtr.Zero) {
        if (swigCMemOwn) {
          swigCMemOwn = false;
          $imclassname.swig_tuple_delete_$csclassname(swigCPtr);
        }
        swigCPtr = new global::System.Runtime.InteropServices.HandleRef(null, global::System.IntPtr.Zero);
      }
      global::System.GC.SuppressFinalize(this);
    }
  }

  /* Tuple.Item N 감싸기 : 네이티브에서 즉시 읽기 */
  public new $typemap(cstype,T1) Item1 =>
      $imclassname.swig_tuple_get0_$csclassname(swigCPtr);
  public new $typemap(cstype,T2) Item2 =>
      $imclassname.swig_tuple_get1_$csclassname(swigCPtr);
  public new $typemap(cstype,T3) Item3 =>
      $imclassname.swig_tuple_get2_$csclassname(swigCPtr);
%}

/*------------------------------------------------------------------*
 * (F)  네이티브 helper ↔ P/Invoke 이름 연결
 *------------------------------------------------------------------*/
%rename(swig_tuple_new_$csclassname)    swig_tuple_new< T1,T2,T3 >;
%rename(swig_tuple_delete_$csclassname) swig_tuple_delete< T1,T2,T3 >;
%rename(swig_tuple_get0_$csclassname)   swig_tuple_get0< T1,T2,T3 >;
%rename(swig_tuple_get1_$csclassname)   swig_tuple_get1< T1,T2,T3 >;
%rename(swig_tuple_get2_$csclassname)   swig_tuple_get2< T1,T2,T3 >;

%enddef   /* SWIG_STD_TUPLE3_PTR */

/* --------------------------------------------------------------------------
 * 2. std::tuple 템플릿에 매크로 적용
 * ------------------------------------------------------------------------*/
namespace std {
  template<class T1,class T2,class T3>
  class tuple {
    SWIG_STD_TUPLE3_PTR(T1,T2,T3)
  };
}
