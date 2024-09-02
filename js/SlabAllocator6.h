#include <iostream>
#include <vector>
#include <windows.h>  // For CRITICAL_SECTION

// Slab Allocator 클래스 정의
class SlabAllocator {
public:
    // 생성자
    SlabAllocator(size_t objectSize, size_t slabSize);
    
    // 메모리 할당 및 해제 함수
    void* allocate();
    void deallocate(void* object);

    // 소멸자
    ~SlabAllocator();

private:
    struct Slab {
        void* start;          // Slab 시작 주소
        std::vector<void*> freeList;  // 사용되지 않은 블록 리스트
    };

    size_t objectSize;  // 할당할 객체의 크기
    size_t slabSize;    // Slab의 크기
    std::vector<Slab> slabs;  // Slab 리스트

    CRITICAL_SECTION criticalSection;  // 멀티스레드 환경에서의 동기화를 위한 CRITICAL_SECTION

    // 새로운 Slab을 생성하는 함수
    void createNewSlab();
};

// 생성자 구현
SlabAllocator::SlabAllocator(size_t objectSize, size_t slabSize) 
    : objectSize(objectSize), slabSize(slabSize) {
    InitializeCriticalSection(&criticalSection);  // CRITICAL_SECTION 초기화
    createNewSlab();  // 초기 Slab 생성
}

// Slab 생성 함수 구현
void SlabAllocator::createNewSlab() {
    EnterCriticalSection(&criticalSection);  // CRITICAL_SECTION 잠금

    Slab newSlab;
    newSlab.start = operator new(slabSize * objectSize);  // Slab 크기만큼 메모리 할당

    // Slab 내 모든 블록을 freeList에 추가
    for (size_t i = 0; i < slabSize; ++i) {
        void* block = static_cast<char*>(newSlab.start) + i * objectSize;
        newSlab.freeList.push_back(block);
    }

    slabs.push_back(newSlab);  // Slab 리스트에 추가

    LeaveCriticalSection(&criticalSection);  // CRITICAL_SECTION 잠금 해제
}

// 메모리 할당 함수 구현
void* SlabAllocator::allocate() {
    EnterCriticalSection(&criticalSection);  // CRITICAL_SECTION 잠금

    for (std::vector<Slab>::iterator it = slabs.begin(); it != slabs.end(); ++it) {
        Slab& slab = *it;
        if (!slab.freeList.empty()) {
            void* object = slab.freeList.back();  // freeList에서 블록 하나를 가져옴
            slab.freeList.pop_back();  // 가져온 블록을 freeList에서 제거
            LeaveCriticalSection(&criticalSection);  // CRITICAL_SECTION 잠금 해제
            return object;
        }
    }

    // 모든 Slab이 가득 찼다면 새로운 Slab 생성
    createNewSlab();
    LeaveCriticalSection(&criticalSection);  // CRITICAL_SECTION 잠금 해제
    return allocate();  // 새로운 Slab에서 다시 할당 시도
}

// 메모리 해제 함수 구현
void SlabAllocator::deallocate(void* object) {
    EnterCriticalSection(&criticalSection);  // CRITICAL_SECTION 잠금

    for (std::vector<Slab>::iterator it = slabs.begin(); it != slabs.end(); ++it) {
        Slab& slab = *it;
        if (object >= slab.start && object < static_cast<char*>(slab.start) + slabSize * objectSize) {
            slab.freeList.push_back(object);  // 해제된 블록을 freeList에 추가
            LeaveCriticalSection(&criticalSection);  // CRITICAL_SECTION 잠금 해제
            return;
        }
    }

    // 이 객체는 이 Slab Allocator에서 할당된 것이 아님
    std::cerr << "Error: Deallocating invalid object!" << std::endl;

    LeaveCriticalSection(&criticalSection);  // CRITICAL_SECTION 잠금 해제
}

// 소멸자 구현
SlabAllocator::~SlabAllocator() {
    EnterCriticalSection(&criticalSection);  // CRITICAL_SECTION 잠금

    for (std::vector<Slab>::iterator it = slabs.begin(); it != slabs.end(); ++it) {
        Slab& slab = *it;
        operator delete(slab.start);  // Slab의 메모리 해제
    }

    slabs.clear();  // Slab 리스트 비움
    LeaveCriticalSection(&criticalSection);  // CRITICAL_SECTION 잠금 해제
    DeleteCriticalSection(&criticalSection);  // CRITICAL_SECTION 삭제
}

// 테스트 함수
int main() {
    SlabAllocator allocator(64, 100);  // 객체 크기 64바이트, Slab 크기 100개의 객체

    void* obj1 = allocator.allocate();  // 객체 할당
    void* obj2 = allocator.allocate();  // 또 다른 객체 할당

    allocator.deallocate(obj1);  // 첫 번째 객체 해제
    allocator.deallocate(obj2);  // 두 번째 객체 해제

    return 0;
}
