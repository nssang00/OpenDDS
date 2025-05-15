/* ---------------------------------------------------------------------------
 * std_tuple.i
 *
 * SWIG typemaps / proxy for fixed-size std::tuple<T1,T2,T3>
 * Exposes it as System.Tuple<T1,T2,T3> in C#.
 *
 * Usage:
 *   %include "std_tuple.i"
 *   %template(MyTuple) std::tuple<int,double,std::string>;
 *   void update(const MyTuple &tuple);
 * --------------------------------------------------------------------------- */

%{
#include <tuple>   /* real header for the C++ compiler */
%}

/* ---------------------------------------------------------------------------
 * internal macro – generates all glue code for a 3-element tuple
 * --------------------------------------------------------------------------- */
%define SWIG_STD_TUPLE3_INTERNAL(T1, T2, T3)

/* ---------- C# type mappings ---------- */
%typemap(cstype)           std::tuple< T1, T2, T3 > \
  "global::System.Tuple<$typemap(cstype,T1), $typemap(cstype,T2), $typemap(cstype,T3)>"
%typemap(imtype)           std::tuple< T1, T2, T3 > "$typemap(cstype)"
%typemap(csin)             std::tuple< T1, T2, T3 > "$csinput"
%typemap(csout)            std::tuple< T1, T2, T3 > "$csoutput"
%typemap(csdirectorin)     std::tuple< T1, T2, T3 > "$csinput"
%typemap(csinterfaces)     std::tuple< T1, T2, T3 > "global::System.IDisposable"

/* ---------- C# proxy additions ---------- */
%proxycode %{
  /* C# ctor → native std::tuple */
  public $csclassname($typemap(cstype,T1) item1,
                      $typemap(cstype,T2) item2,
                      $typemap(cstype,T3) item3)
    : this(__NativeNew(item1, item2, item3), true) { }

  /* read-only Item1/2/3 (matches System.Tuple API) */
  public $typemap(cstype,T1) Item1 { get { return get0(); } }
  public $typemap(cstype,T2) Item2 { get { return get1(); } }
  public $typemap(cstype,T3) Item3 { get { return get2(); } }

  /* Deconstruct support (C# 7) */
  public void Deconstruct(out $typemap(cstype,T1) v1,
                          out $typemap(cstype,T2) v2,
                          out $typemap(cstype,T3) v3)
  {
      v1 = Item1; v2 = Item2; v3 = Item3;
  }
%}

/* hide helper methods from the public surface */
%rename(get0) get0;
%rename(get1) get1;
%rename(get2) get2;
%csmethodmodifiers __NativeNew "private"
%csmethodmodifiers get0       "private"
%csmethodmodifiers get1       "private"
%csmethodmodifiers get2       "private"

/* ---------- native helpers injected via %extend ---------- */
public:
  typedef std::tuple< T1, T2, T3 > self_type;

  tuple();
  tuple(const tuple& other);
  tuple(const T1& a, const T2& b, const T3& c);

  %extend {
    static self_type *__NativeNew(const T1& a, const T2& b, const T3& c) {
      return new self_type(a, b, c);
    }

    const T1& get0() const { return std::get<0>(*($self)); }
    const T2& get1() const { return std::get<1>(*($self)); }
    const T3& get2() const { return std::get<2>(*($self)); }
  }

%enddef   /* SWIG_STD_TUPLE3_INTERNAL */

/* ---------------------------------------------------------------------------
 * dummy class declaration for SWIG – does not clash with real <tuple>
 * --------------------------------------------------------------------------- */
namespace std {
  template<class T1, class T2, class T3>
  class tuple {
    SWIG_STD_TUPLE3_INTERNAL(T1, T2, T3)
  };
}
