/*--------------------------------------------------------------*
 * std_tuple3.i   ―   std::tuple<T1,T2,T3>   ↔   C#
 *   · C# 쪽엔 프록시 클래스(MyTuple) 생성 → new/delete 가능
 *   · C++ 함수 시그니처는 ① const MyTuple& ② by-value return 만 지원
 *--------------------------------------------------------------*/
%{
#include <tuple>
%}

/* ---------- 0) 네이티브 helper ---------- */
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

/* ---------- 1) 매크로 정의 ---------- */
%define SWIG_STD_TUPLE3_PTR(T1,T2,T3)

/* (A) C# 타입 매핑 */
%typemap(cstype)             std::tuple<T1,T2,T3>*            "$csclassname"
%typemap(cstype)       const std::tuple<T1,T2,T3>&            "$csclassname"

/* (B) IDisposable */
%typemap(csinterfaces) std::tuple<T1,T2,T3>* "System.IDisposable"

/* (C) C# → C++ (포인터 전달) */
%typemap(csin) std::tuple<T1,T2,T3>* "$csclassname $csinput"
%typemap(in)   std::tuple<T1,T2,T3>* "$1 = $input;"

/* const& 인자 지원 ─ 포인터 역참조 */
%typemap(csin) const std::tuple<T1,T2,T3>& "$csclassname $csinput"
%typemap(in)   const std::tuple<T1,T2,T3>&
   (std::tuple<T1,T2,T3>* tmp) {
     tmp = $input;   /* 동일 객체 */
     $1  = *tmp;     /* const& 로 전달 */
}

/* (D) C++ → C# 반환 (포인터) */
%typemap(csout) std::tuple<T1,T2,T3>* \
  "new $csclassname($imcall, false)"   /* false: C++이 소유 */

/* (E) 프록시 클래스 본문 */
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

  /* 생성자 & 게터 */
  public $csclassname($typemap(cstype,T1) a,
                      $typemap(cstype,T2) b,
                      $typemap(cstype,T3) c)
      : this(examplePINVOKE.swig_tuple_new_$csclassname(a,b,c), true) {}

  public $typemap(cstype,T1) Item1 => examplePINVOKE.swig_tuple_get0_$csclassname(swigCPtr);
  public $typemap(cstype,T2) Item2 => examplePINVOKE.swig_tuple_get1_$csclassname(swigCPtr);
  public $typemap(cstype,T3) Item3 => examplePINVOKE.swig_tuple_get2_$csclassname(swigCPtr);
%}

/* (F) helper → P/Invoke 이름 바인딩 (vector/map 과 동일 패턴) */
%rename(swig_tuple_new_$csclassname)    swig_tuple_new< T1,T2,T3 >;
%rename(swig_tuple_delete_$csclassname) swig_tuple_delete< T1,T2,T3 >;
%rename(swig_tuple_get0_$csclassname)   swig_tuple_get0< T1,T2,T3 >;
%rename(swig_tuple_get1_$csclassname)   swig_tuple_get1< T1,T2,T3 >;
%rename(swig_tuple_get2_$csclassname)   swig_tuple_get2< T1,T2,T3 >;

%enddef   /* SWIG_STD_TUPLE3_PTR */

/* ---------- 2) 템플릿 본문 (= vector.i/map.i 방식) ---------- */
namespace std {
  template<class T1,class T2,class T3>
  class tuple {
    SWIG_STD_TUPLE3_PTR(T1,T2,T3)
  };
}
