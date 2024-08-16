%module example

%{
#include <vector>
#ifdef USE_CUSTOM_ALLOCATOR
#include "customallocator.h"
#define customallocator stc_alloc<int>
#else
#include <memory>
#define customallocator std::allocator<int>
#endif
%}

// SWIG이 customallocator를 그대로 출력하도록 합니다.
%define CUSTOM_ALLOCATOR
#ifdef USE_CUSTOM_ALLOCATOR
#define customallocator stc_alloc<int>
#else
#define customallocator std::allocator<int>
#endif
%enddef

CUSTOM_ALLOCATOR

// SWIG이 `customallocator`를 직접 사용하도록 합니다.
%template(IntVector) std::vector<int, customallocator>;
