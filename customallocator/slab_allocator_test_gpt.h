#include <iostream>
#include <ctime>
#include <cstdlib>

#include "SlabAllocator.h" // Slab Allocator 헤더 파일을 포함합니다.

#define NUM_ALLOCATIONS 1000000

void testMallocFree() {
    std::cout << "Testing malloc/free..." << std::endl;
    clock_t start = clock();

    for (int i = 0; i < NUM_ALLOCATIONS; ++i) {
        // 다양한 크기의 메모리 할당 테스트 (8에서 4096 바이트 사이)
        size_t size = (rand() % 512) * 8 + 8; // 8, 16, ..., 4096
        void* ptr = malloc(size);
        if (ptr) {
            free(ptr);
        }
    }

    clock_t end = clock();
    double duration = double(end - start) / CLOCKS_PER_SEC;
    std::cout << "Time taken by malloc/free: " << duration << " seconds" << std::endl;
}

void testSlabAllocator() {
    std::cout << "Testing SlabAllocator..." << std::endl;
    SlabAllocator* allocator = SlabAllocator::Instance();
    clock_t start = clock();

    for (int i = 0; i < NUM_ALLOCATIONS; ++i) {
        // 다양한 크기의 메모리 할당 테스트 (8에서 4096 바이트 사이)
        size_t size = (rand() % 512) * 8 + 8; // 8, 16, ..., 4096
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
    srand(static_cast<unsigned int>(time(0)));

    // malloc/free 성능 테스트
    testMallocFree();

    // SlabAllocator 성능 테스트
    testSlabAllocator();

    return 0;
}
