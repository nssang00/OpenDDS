/* -----------------------------------------------------------------------------
 * std_tuple.i
 *
 * SWIG typemap for std::tuple<T1, T2, T3>
 * Exposes it as System.Tuple<T1, T2, T3> in C#.
 * ----------------------------------------------------------------------------- */

%{
#include <tuple>
%}

/* Define the tuple wrapper logic for fixed-size 3-element tuples */
%define SWIG_STD_TUPLE3_INTERNAL(T1, T2, T3)

/* Map the C++ tuple to a .NET System.Tuple type */
%typemap(cstype) std::tuple<T1, T2, T3> "global::System.Tuple<$typemap(cstype,T1), $typemap(cstype,T2), $typemap(cstype,T3)>"
%typemap(imtype) std::tuple<T1, T2, T3> "global::System.Tuple<$typemap(cstype,T1), $typemap(cstype,T2), $typemap(cstype,T3)>"
%typemap(csin) std::tuple<T1, T2, T3> "$csinput"
%typemap(csout) std::tuple<T1, T2, T3> "$csoutput"
%typemap(csdirectorin) std::tuple<T1, T2, T3> "$csinput"
%typemap(csinterfaces) std::tuple<T1, T2, T3> "global::System.IDisposable"

/* C# proxy enhancements */
%proxycode %{
  public $csclassname($typemap(cstype,T1) item1, $typemap(cstype,T2) item2, $typemap(cstype,T3) item3)
    : this(__NativeNew(item1, item2, item3), true) { }

  public $typemap(cstype,T1) Item1 { get { return get0(); } }
  public $typemap(cstype,T2) Item2 { get { return get1(); } }
  public $typemap(cstype,T3) Item3 { get { return get2(); } }

  public void Deconstruct(out $typemap(cstype,T1) item1,
                          out $typemap(cstype,T2) item2,
                          out $typemap(cstype,T3) item3) {
      item1 = Item1; item2 = Item2; item3 = Item3;
  }
%}

/* Private SWIG constructor helpers */
%rename(get0) get0;
%rename(get1) get1;
%rename(get2) get2;
%csmethodmodifiers __NativeNew "private"
%csmethodmodifiers get0 "private"
%csmethodmodifiers get1 "private"
%csmethodmodifiers get2 "private"

%extend {
  static std::tuple<T1, T2, T3>* __NativeNew(const T1& a, const T2& b, const T3& c) {
    return new std::tuple<T1, T2, T3>(a, b, c);
  }

  const T1& get0() const { return std::get<0>(*$self); }
  const T2& get1() const { return std::get<1>(*$self); }
  const T3& get2() const { return std::get<2>(*$self); }
}

%enddef

/* Final template declaration */
namespace std {
  template<class T1, class T2, class T3>
  class tuple {
    SWIG_STD_TUPLE3_INTERNAL(T1, T2, T3)
  };
}
