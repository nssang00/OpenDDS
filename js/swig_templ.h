#include <vector>

#ifdef USE_CUSTOM_ALLOCATOR
#include "CustomAllocator.h"
#define STC_ALLOCATOR CustomAllocator<int>
#else
#define STC_ALLOCATOR std::allocator<int>
#endif

// SWIG용 별도의 매크로 정의
#define SWIG_STC_ALLOCATOR STC_ALLOCATOR

class Example {
public:
    std::vector<int, SWIG_STC_ALLOCATOR> getIntList(int size);
};

%module example

%{
#include "example.h"
%}

// std::vector 템플릿 사용을 위한 포함
%include <std_vector.i>

// C++ 헤더 파일 포함
%include "example.h"

// std::vector<int, SWIG_STC_ALLOCATOR>에 대한 템플릿 정의
%template(IntList) std::vector<int, SWIG_STC_ALLOCATOR>;
