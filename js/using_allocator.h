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

// vector에 적용
std::vector<int, MyAllocator<int>> myVector;
