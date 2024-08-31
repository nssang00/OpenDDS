#include <iostream>
#include <ctime>
#include <cstdlib>
#include <vector>

class Mutex {
public:
    Mutex();
    ~Mutex();

    void lock();
    void unlock();

private:
    CRITICAL_SECTION cs;
};

#include "SlabAllocator.h" // Slab Allocator 헤더 파일을 포함합니다.

#define NUM_ALLOCATIONS 1000000
#define MIN_SIZE 8           // 최소 8바이트
#define MAX_SIZE 1024 * 1024 // 최대 1MB

// 고정된 메모리 크기를 저장할 벡터
std::vector<size_t> sizes(NUM_ALLOCATIONS);

void generateSizes() {
    for (int i = 0; i < NUM_ALLOCATIONS; ++i) {
        sizes[i] = (rand() % (MAX_SIZE - MIN_SIZE + 1)) + MIN_SIZE; // 8바이트 ~ 1MB 사이 크기
    }
}

bool deleted = false; // 메모리 해제 여부

void testMallocFree() {
    std::vector<void*> ptrs;
    ptrs.reserve(NUM_ALLOCATIONS);
    std::cout << "Testing malloc/free..." << std::endl;
    clock_t start = clock();

    for (int i = 0; i < NUM_ALLOCATIONS; ++i) {
        size_t size = sizes[i]; // 고정된 사이즈 사용
        void* ptr = malloc(size);
        if (ptr) {
            memset(ptr, 0, size); // 메모리를 0으로 초기화
            ptrs.push_back(ptr);
        }
        if (deleted && ptr) {
            free(ptr);
        }
    }

    clock_t end = clock();
    double duration = double(end - start) / CLOCKS_PER_SEC;
    std::cout << "Time taken by malloc/free: " << duration << " seconds" << std::endl;

    if (deleted)
        return;
    
    for (int i = 0; i < NUM_ALLOCATIONS; ++i) {
        free(ptrs[i]);
    }
    ptrs.clear();
}


void testSlabAllocator() {
    std::cout << "Testing SlabAllocator..." << std::endl;
    SlabAllocator* allocator = SlabAllocator::Instance();
    clock_t start = clock();

    for (int i = 0; i < NUM_ALLOCATIONS; ++i) {
        size_t size = sizes[i]; // 고정된 사이즈 사용
        void* ptr = allocator->allocate(size);
        if (ptr) {
            allocator->free(ptr, size);
        }
    }

    clock_t end = clock();
    double duration = double(end - start) / CLOCKS_PER_SEC;
    std::cout << "Time taken by SlabAllocator: " << duration << " seconds" << std::endl;
}

int main() {
    // 난수 생성기 시드 설정
    srand(static_cast<unsigned int>(time(0))); // 동일한 시드를 사용하여 난수를 고정

    // 메모리 크기 생성
    generateSizes();

    // malloc/free 성능 테스트
    testMallocFree();

    // SlabAllocator 성능 테스트
    testSlabAllocator();

    return 0;
}

Mutex::Mutex() {
    InitializeCriticalSection(&cs);
}

Mutex::~Mutex() {
    DeleteCriticalSection(&cs);
}

void Mutex::lock() {
    EnterCriticalSection(&cs);
}

void Mutex::unlock() {
    LeaveCriticalSection(&cs);
}
