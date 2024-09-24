// example.h
#include <vector>

#ifdef USE_CUSTOM_ALLOCATOR
#include "CustomAllocator.h"
#define STC_ALLOCATOR CustomAllocator<int>
#else
#define STC_ALLOCATOR std::allocator<int>
#endif

class Example {
public:
    std::vector<int, STC_ALLOCATOR> getIntList(int size);
};

// example.cpp
#include "example.h"

std::vector<int, STC_ALLOCATOR> Example::getIntList(int size) {
    std::vector<int, STC_ALLOCATOR> vec;
    for (int i = 0; i < size; ++i) {
        vec.push_back(i);
    }
    return vec;
}
//////example.i
%module example

%{
#include "example.h"
%}

// std::vector 템플릿 사용을 위한 포함
%include <std_vector.i>

// C++ 헤더 파일 포함
%include "example.h"

// std::vector<int, STC_ALLOCATOR>에 대한 템플릿 정의
%template(IntList) std::vector<int, STC_ALLOCATOR>;


swig -csharp -c++ -DUSE_CUSTOM_ALLOCATOR example.i
g++ -shared -fPIC example.cpp -o example.so -I/usr/include/ -I/path/to/swig/include
