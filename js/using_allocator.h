#ifdef USE_CUSTOM_ALLOCATOR
    // USE_STC_MM가 정의되어 있으면 CustomAllocator 사용
    template <typename T>
    typedef CustomAllocator<T> STC_ALLOCATOR;
#else
    // USE_STC_MM가 정의되어 있지 않으면 std::allocator 사용
    template <typename T>
    typedef std::allocator<T> STC_ALLOCATOR;
#endif

std::vector<int, STC_ALLOCATOR<int>> vec;

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

// 사용 예시: USE_CUSTOM_ALLOCATOR가 정의된 경우 CustomAllocator 사용, 그렇지 않은 경우 std::allocator 사용
std::vector<int, STC_ALLOCATOR<int>::type> myVector;



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
