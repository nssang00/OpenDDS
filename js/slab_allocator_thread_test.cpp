#include <iostream>
#include <ctime>
#include <cstdlib>
#include <windows.h>
#include "SlabAllocator.h" // Slab Allocator 헤더 파일을 포함합니다.

#define NUM_ALLOCATIONS 1000000
#define NUM_THREADS 4 // 사용할 스레드 수

struct ThreadData {
    int numAllocations;
    SlabAllocator* allocator; // SlabAllocator 인스턴스
};

// malloc/free를 수행하는 스레드 함수
DWORD WINAPI MallocFreeThreadFunc(LPVOID lpParam) {
    int numAllocations = *(int*)lpParam;
    
    for (int i = 0; i < numAllocations; ++i) {
        size_t size = (rand() % 512) * 8 + 8; // 8, 16, ..., 4096
        void* ptr = malloc(size);
        if (ptr) {
            free(ptr);
        }
    }

    return 0;
}

// SlabAllocator를 사용하는 스레드 함수
DWORD WINAPI SlabAllocThreadFunc(LPVOID lpParam) {
    ThreadData* data = (ThreadData*)lpParam;

    for (int i = 0; i < data->numAllocations; ++i) {
        size_t size = (rand() % 512) * 8 + 8; // 8, 16, ..., 4096
        void* ptr = data->allocator->allocate(size);
        if (ptr) {
            data->allocator->free(ptr, size);
        }
    }

    return 0;
}

void testMallocFree() {
    std::cout << "Testing malloc/free with multiple threads..." << std::endl;
    clock_t start = clock();

    HANDLE threads[NUM_THREADS];
    int numAllocations = NUM_ALLOCATIONS / NUM_THREADS;

    // 여러 스레드 생성
    for (int i = 0; i < NUM_THREADS; ++i) {
        threads[i] = CreateThread(NULL, 0, MallocFreeThreadFunc, &numAllocations, 0, NULL);
    }

    // 모든 스레드가 작업을 마치기를 기다림
    WaitForMultipleObjects(NUM_THREADS, threads, TRUE, INFINITE);

    // 스레드 핸들 닫기
    for (int i = 0; i < NUM_THREADS; ++i) {
        CloseHandle(threads[i]);
    }

    clock_t end = clock();
    double duration = double(end - start) / CLOCKS_PER_SEC;
    std::cout << "Time taken by malloc/free: " << duration << " seconds" << std::endl;
}

void testSlabAllocator() {
    std::cout << "Testing SlabAllocator with multiple threads..." << std::endl;
    SlabAllocator* allocator = SlabAllocator::Instance();
    clock_t start = clock();

    HANDLE threads[NUM_THREADS];
    ThreadData data;
    data.numAllocations = NUM_ALLOCATIONS / NUM_THREADS;
    data.allocator = allocator;

    // 여러 스레드 생성
    for (int i = 0; i < NUM_THREADS; ++i) {
        threads[i] = CreateThread(NULL, 0, SlabAllocThreadFunc, &data, 0, NULL);
    }

    // 모든 스레드가 작업을 마치기를 기다림
    WaitForMultipleObjects(NUM_THREADS, threads, TRUE, INFINITE);

    // 스레드 핸들 닫기
    for (int i = 0; i < NUM_THREADS; ++i) {
        CloseHandle(threads[i]);
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
