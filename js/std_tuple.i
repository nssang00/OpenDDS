// std_tuple.i

%{
#include <tuple>
%}

%inline %{
    template<typename T1, typename T2, typename T3>
    struct tuple_wrapper {
    private:
        std::tuple<T1, T2, T3> t;
    public:
        tuple_wrapper() : t() {}
        tuple_wrapper(T1 a, T2 b, T3 c) : t(a, b, c) {}

        T1 get_Item1() const { return std::get<0>(t); }
        void set_Item1(T1 v) { std::get<0>(t) = v; }

        T2 get_Item2() const { return std::get<1>(t); }
        void set_Item2(T2 v) { std::get<1>(t) = v; }

        T3 get_Item3() const { return std::get<2>(t); }
        void set_Item3(T3 v) { std::get<2>(t) = v; }
    };
%}

// 매크로 정의
%define DEFINE_TUPLE_WRAPPER3(NAME, T1, T2, T3, CS1, CS2, CS3)
  %typemap(cscode) tuple_wrapper<T1, T2, T3> %{
    public CS1 Item1 {
      get { return get_Item1(); }
      set { set_Item1(value); }
    }
    public CS2 Item2 {
      get { return get_Item2(); }
      set { set_Item2(value); }
    }
    public CS3 Item3 {
      get { return get_Item3(); }
      set { set_Item3(value); }
    }
  %}

  %ignore NAME;
  %typedef tuple_wrapper<T1, T2, T3> NAME;
  %template(NAME) tuple_wrapper<T1, T2, T3>;
%enddef
