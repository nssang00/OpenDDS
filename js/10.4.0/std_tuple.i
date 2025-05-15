/* -----------------------------------------------------------------------------
 * std_tuple.i
 *
 * SWIG typemaps for std::tuple
 * ----------------------------------------------------------------------------- */

%{
#include <tuple>
%}

%define SWIG_STD_TUPLE3_INTERNAL(T1, T2, T3)
%proxycode %{
  public $typemap(cstype,T1) Item1 { 
    get { 
      return getItem1(); 
    } 
  }
  public $typemap(cstype,T2) Item2 { 
    get { 
      return getItem2(); 
    } 
  }
  public $typemap(cstype,T3) Item3 { 
    get { 
      return getItem3(); 
    } 
  }

  public void Deconstruct(out $typemap(cstype,T1) val1,
                          out $typemap(cstype,T2) val2,
                          out $typemap(cstype,T3) val3)
  { 
    val1 = Item1; 
    val2 = Item2; 
    val3 = Item3; 
  }
%}

%rename(getItem1) getItem1;
%rename(getItem2) getItem2;
%rename(getItem3) getItem3;

%csmethodmodifiers getItem1 "private"
%csmethodmodifiers getItem2 "private"
%csmethodmodifiers getItem3 "private"

public:
  tuple();
  tuple(const tuple&);
  tuple(const T1&, const T2&, const T3&);

  %extend {
    const T1& getItem1() const { return std::get<0>(*($self)); }
    const T2& getItem2() const { return std::get<1>(*($self)); }
    const T3& getItem3() const { return std::get<2>(*($self)); }
  }

%enddef 

// Default implementation
namespace std {
  template<class T1,class T2,class T3> class tuple {
    SWIG_STD_TUPLE3_INTERNAL(T1,T2,T3)
  };
}
