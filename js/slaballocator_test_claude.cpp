#include <iostream>
#include <vector>
#include <ctime>
#include <windows.h>
#include "SlabAllocator.h" // 앞서 작성한 SlabAllocator 클래스가 이 헤더 파일에 있다고 가정합니다.

// 성능 측정을 위한 타이머 클래스
class Timer {
private:
    LARGE_INTEGER start, end, freq;
public:
    Timer() {
        QueryPerformanceFrequency(&freq);
    }
    void Start() {
        QueryPerformanceCounter(&start);
    }
    double Stop() {
        QueryPerformanceCounter(&end);
        return static_cast<double>(end.QuadPart - start.QuadPart) / freq.QuadPart;
    }
};

// 테스트를 위한 간단한 객체
struct TestObject {
    int data[16]; // 64바이트 객체
};

// 기본 할당자를 사용한 테스트
void testDefaultAllocator(size_t numAllocations) {
    Timer timer;
    std::vector<TestObject*> objects;
    objects.reserve(numAllocations);

    timer.Start();
    for (size_t i = 0; i < numAllocations; ++i) {
        objects.push_back(new TestObject());
    }
    for (size_t i = 0; i < numAllocations; ++i) {
        delete objects[i];
    }
    double time = timer.Stop();

    std::cout << "Default allocator: " << time << " seconds" << std::endl;
}

// SlabAllocator를 사용한 테스트
void testSlabAllocator(size_t numAllocations) {
    Timer timer;
    SlabAllocator allocator;
    std::vector<TestObject*> objects;
    objects.reserve(numAllocations);

    timer.Start();
    for (size_t i = 0; i < numAllocations; ++i) {
        objects.push_back(static_cast<TestObject*>(allocator.allocate(sizeof(TestObject))));
    }
    for (size_t i = 0; i < numAllocations; ++i) {
        allocator.deallocate(objects[i], sizeof(TestObject));
    }
    double time = timer.Stop();

    std::cout << "Slab allocator: " << time << " seconds" << std::endl;
}

int main() {
    const size_t NUM_ALLOCATIONS = 1000000; // 백만 번의 할당/해제

    std::cout << "Testing with " << NUM_ALLOCATIONS << " allocations:" << std::endl;

    testDefaultAllocator(NUM_ALLOCATIONS);
    testSlabAllocator(NUM_ALLOCATIONS);

    return 0;
}
