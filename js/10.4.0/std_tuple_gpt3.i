/* -----------------------------------------------------------------------------
 *  std_tuple.i — std::tuple<T1,T2,T3>   ↔   C# proxy (HandleRef 소유 모델)
 *
 *  사용 예
 *  -------
 *    %include "std_tuple.i"
 *    %template(MyTuple) std::tuple<int,double,std::string>*;    // 포인터형!
 *
 *    // C++ API
 *    void add_object(const MyTuple& t);   // OK
 *    MyTuple* make_obj();
 *
 *    // C#
 *    var t = new MyTuple(1,2.5,"hi");
 *    Example.add_object(t);
 *    MyTuple r = Example.make_obj();
 *    r.Dispose();
 * ----------------------------------------------------------------------------*/

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
 * 1. 매크로:  3-원소 tuple ↔ C# proxy (HandleRef 보존)
 * ------------------------------------------------------------------------*/
%define SWIG_STD_TUPLE3_PTR(T1,T2,T3)

/*------------------------------------------------------------------*
 * (A) C# 타입 매핑
 *------------------------------------------------------------------*/
%typemap(cstype)             std::tuple<T1,T2,T3>*            "$csclassname"
%typemap(cstype)       const std::tuple<T1,T2,T3>&            "$csclassname"

%typemap(csinterfaces) std::tuple<T1,T2,T3>* "System.IDisposable"

/*------------------------------------------------------------------*
 * (B)  C# → C++  (포인터 & const&)
 *------------------------------------------------------------------*/
/*  포인터 그대로 전달 */
%typemap(csin) std::tuple<T1,T2,T3>* "$csclassname $csinput"
%typemap(in)   std::tuple<T1,T2,T3>* "$1 = $input;"

/*  const& 인자:  포인터 역참조하여 값 전달 */
%typemap(csin) const std::tuple<T1,T2,T3>& "$csclassname $csinput"
%typemap(in)   const std::tuple<T1,T2,T3>&
    (std::tuple<T1,T2,T3>* tmp) {
      tmp = $input;  /* 동일 객체 가리킴 */
      $1  = *tmp;    /* 값 복사하여 const& 에 전달 */
}

/*  by-value 인자 (복사) */
%typemap(csin) std::tuple<T1,T2,T3> "$csclassname $csinput"
%typemap(in)   std::tuple<T1,T2,T3>
    (std::tuple<T1,T2,T3>* tmp) {
      tmp = $input;
      $1  = *tmp;
}

/*------------------------------------------------------------------*
 * (C)  C++ → C#  반환
 *------------------------------------------------------------------*/
%typemap(csout) std::tuple<T1,T2,T3>* \
  "new $csclassname($imcall, false)"   /* false: 소유권은 C++ 측 */

/*------------------------------------------------------------------*
 * (D)  proxy 클래스 베이스
 *------------------------------------------------------------------*/
%typemap(csbase) std::tuple<T1,T2,T3>* "object"

/*------------------------------------------------------------------*
 * (E)  proxy 클래스 본문
 *------------------------------------------------------------------*/
%typemap(csbody) std::tuple<T1,T2,T3>* %{
  private global::System.Runtime.InteropServices.HandleRef swigCPtr;
  protected bool swigCMemOwn;

  internal $csclassname(global::System.IntPtr cPtr, bool own) {
    swigCPtr = new global::System.Runtime.InteropServices.HandleRef(this, cPtr);
    swigCMemOwn = own;
  }
  public static global::System.IntPtr getCPtr($csclassname obj) =>
      obj == null ? global::System.IntPtr.Zero : obj.swigCPtr.Handle;

  ~${csclassname}() { Dispose(); }

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

  /* ---- public API ---- */
  public $csclassname($typemap(cstype,T1) a,
                      $typemap(cstype,T2) b,
                      $typemap(cstype,T3) c)
      : this(examplePINVOKE.swig_tuple_new_$csclassname(a,b,c), true) {}

  public $typemap(cstype,T1) Item1 => examplePINVOKE.swig_tuple_get0_$csclassname(swigCPtr);
  public $typemap(cstype,T2) Item2 => examplePINVOKE.swig_tuple_get1_$csclassname(swigCPtr);
  public $typemap(cstype,T3) Item3 => examplePINVOKE.swig_tuple_get2_$csclassname(swigCPtr);
%}

/*------------------------------------------------------------------*
 * (F)  네이티브 helper <-> PINVOKE 이름 연결
 *      · 벡터/맵과 동일한 “new_$csclassname” 패턴 사용
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
