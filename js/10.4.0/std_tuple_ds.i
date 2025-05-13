// std_tuple.i
%module example
%{
#include <tuple>
#include <string>
%}

// std::string 지원 활성화
%include "std_string.i"

// std::tuple<T1, T2, T3>에 대한 일반적인 래핑
namespace std {
    template <class T1, class T2, class T3>
    class tuple<T1, T2, T3> {
    public:
        tuple();
        tuple(T1 first, T2 second, T3 third);
        %extend {
            T1 get_Item1() { return std::get<0>(*$self); }
            T2 get_Item2() { return std::get<1>(*$self); }
            T3 get_Item3() { return std::get<2>(*$self); }
        }
    };
}

// C++ → C# 출력 변환
%typemap(csout, excode=SWIGEXCODE) std::tuple<T1, T2, T3> {
    global::System.IntPtr cPtr = $imcall;
    var temp = new $csclassname(cPtr, true);
    try {
        return global::System.Tuple.Create(
            ($typemap(cstype, T1))temp.get_Item1(),
            ($typemap(cstype, T2))temp.get_Item2(),
            ($typemap(cstype, T3))temp.get_Item3()
        );
    } finally {
        temp?.Dispose();
    }
}

// C# → C++ 입력 변환
%typemap(csin) std::tuple<T1, T2, T3> %{
    new $csclassname($csinput.Item1, $csinput.Item2, $csinput.Item3, true)
%}

// ObjectInfo에 대한 명시적 템플릿 인스턴스화
%template(ObjectInfo) std::tuple<int, double, std::string>;
