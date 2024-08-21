// Allocator 선택을 위한 매크로 정의 (필요시)
#define USE_CUSTOM_ALLOCATOR

// allocator를 선택하는 typedef
#ifdef USE_CUSTOM_ALLOCATOR
    template<typename T>
    using MyAllocator = CustomAllocator<T>;
#else
    template<typename T>
    using MyAllocator = std::allocator<T>;
#endif

/*
#ifdef USE_CUSTOM_ALLOCATOR
#include "CustomAllocator.h"
#define STC_ALLOCATOR CustomAllocator
#else
#define STC_ALLOCATOR std::allocator
#endif
*/
/*
#ifdef USE_CUSTOM_ALLOCATOR
    template<typename T>
    using STC_ALLOCATOR = CustomAllocator<T>;
#else
    template<typename T>
    using STC_ALLOCATOR = std::allocator<T>;
#endif
*/
#ifdef USE_CUSTOM_ALLOCATOR
    template<typename T>
    struct STC_ALLOCATOR {
        typedef CustomAllocator<T> type;
    };
#else
    template<typename T>
    struct STC_ALLOCATOR {
        typedef std::allocator<T> type;
    };
#endif


// vector에 적용
std::vector<int, MyAllocator<int>> myVector;
