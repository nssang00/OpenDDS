#include <vector>

// Allocator 선택을 위한 매크로 정의 (컴파일 시 -D 매크로로 설정)
#ifdef USE_MYALLOC
    template <class T>
    using Alloc = myalloc<T>;  // 사용자 정의 Allocator
#else
    template <class T>
    using Alloc = std::allocator<T>;  // 기본 Allocator
#endif

template <class T>
using Vec = std::vector<T, Alloc<T>>;

int main() {
    Vec<int> v; // Allocator에 따라 std::vector<int, Alloc<int>>로 재정의됨

    // 벡터에 값 추가 (사용 예)
    v.push_back(10);
    v.push_back(20);

    return 0;
}
