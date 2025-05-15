/* --------------------------------------------------------------------------
 * std_tuple.i
 *
 * SWIG typemaps/proxy for std::tuple< T1, T2, T3 >
 *
 * Exposes the C++ tuple as System.Tuple<T1,T2,T3> in C#.
 *
 * Usage example:
 *   %include "std_tuple.i"
 *   %template(MyTuple) std::tuple<int, double, std::string>;
 *
 *   void update(const MyTuple& tuple);   // C# →  void update(Tuple<int,double,string> tuple);
 * -------------------------------------------------------------------------- */

%{
#include <tuple>
%}

/*---------------------------------------------------------------------------
 * Internal helper – generates the real C++ class wrapper and the C# proxy.
 *---------------------------------------------------------------------------*/
%define SWIG_STD_TUPLE3_INTERNAL(T1,T2,T3)

/* ----------  C# side type mapping ---------- */
%typemap(cstype)     std::tuple< T1, T2, T3 >           "global::System.Tuple<$typemap(cstype,T1), $typemap(cstype,T2), $typemap(cstype,T3)>"
%typemap(csinterfaces) std::tuple< T1, T2, T3 >          "global::System.IDisposable"

/* ----------  C# proxy class additions ---------- */
%proxycode %{
  /* C# constructor that builds the native std::tuple */
  public $csclassname($typemap(cstype,T1) item1, $typemap(cstype,T2) item2, $typemap(cstype,T3) item3)
    : this(__NativeNew(item1, item2, item3), true) { }

  /* Read-only Item1, Item2, Item3 properties mirroring System.Tuple */
  public $typemap(cstype,T1)  Item1 { get { return get0(); } }
  public $typemap(cstype,T2)  Item2 { get { return get1(); } }
  public $typemap(cstype,T3)  Item3 { get { return get2(); } }

  /* Deconstruct support – handy with C# 7 syntax */
  public void Deconstruct(out $typemap(cstype,T1) item1,
                          out $typemap(cstype,T2) item2,
                          out $typemap(cstype,T3) item3) {
      item1 = Item1; item2 = Item2; item3 = Item3;
  }
%}

/* ----------  public C++ API that SWIG wraps ---------- */
public:
    typedef std::tuple< T1, T2, T3 > self_type;

    /* native default/three-argument constructors */
    %extend {
        static self_type * __NativeNew(const T1& a, const T2& b, const T3& c) {
            return new self_type(a, b, c);
        }
    }

    /* element accessors */
    %rename(get0) %inline %{ const T1& get0() const { return std::get<0>(*($self)); } %}
    %rename(get1) %inline %{ const T2& get1() const { return std::get<1>(*($self)); } %}
    %rename(get2) %inline %{ const T3& get2() const { return std::get<2>(*($self)); } %}

/* hide the helper symbols from the C# public surface */
%csmethodmodifiers __NativeNew  "private"
%csmethodmodifiers get0         "private"
%csmethodmodifiers get1         "private"
%csmethodmodifiers get2         "private"

%enddef   /* SWIG_STD_TUPLE3_INTERNAL */

/* --------------------------------------------------------------------------
 * Default implementation for arbitrary T1,T2,T3.
 * -------------------------------------------------------------------------- */
namespace std {
  template<class T1, class T2, class T3>
  class tuple {
    SWIG_STD_TUPLE3_INTERNAL(T1, T2, T3)
  };
}
