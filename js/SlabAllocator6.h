#include <iostream>
#include <vector>
#include <windows.h>  // For CRITICAL_SECTION

class CustomAllocator {
public:
    // Singleton 인스턴스 접근 함수
    static CustomAllocator* Instance(int num = 0);

    // 메모리 할당 및 해제 함수
    void* allocate(size_t size);
    void free(void* object, size_t size);

    // 소멸자
    ~CustomAllocator();

private:
    // Private 생성자
    CustomAllocator(size_t objectSize = 64, size_t slabSize = 100);

    // Slab 구조체 정의
    struct Slab {
        void* start;                // Slab 시작 주소
        std::vector<void*> freeList;  // 사용되지 않은 블록 리스트
    };

    size_t objectSize;  // 할당할 객체의 크기
    size_t slabSize;    // Slab의 크기
    std::vector<Slab> slabs;  // Slab 리스트

    CRITICAL_SECTION criticalSection;  // 동기화용 CRITICAL_SECTION

    static CustomAllocator* instance[2];  // Singleton 인스턴스 배열

    // 새로운 Slab 생성 함수
    void createNewSlab();
};

// Singleton 인스턴스 정의
CustomAllocator* CustomAllocator::instance[2] = { NULL, NULL };

// Private 생성자 구현
CustomAllocator::CustomAllocator(size_t objectSize, size_t slabSize) 
    : objectSize(objectSize), slabSize(slabSize) {
    InitializeCriticalSection(&criticalSection);  // CRITICAL_SECTION 초기화
    createNewSlab();  // 초기 Slab 생성
}

// Slab 생성 함수 구현
void CustomAllocator::createNewSlab() {
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

// Singleton 인스턴스 접근 함수
CustomAllocator* CustomAllocator::Instance(int num) {
    if (!instance[num]) {
        instance[num] = new CustomAllocator();  // 새 인스턴스 생성
    }
    return instance[num];  // 인스턴스 반환
}

// 메모리 할당 함수 구현
void* CustomAllocator::allocate(size_t size) {
    EnterCriticalSection(&criticalSection);  // CRITICAL_SECTION 잠금

    if (size > objectSize) {
        LeaveCriticalSection(&criticalSection);
        return NULL;  // 요청 크기가 슬랩 크기보다 큰 경우 NULL 반환
    }

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
    return allocate(size);  // 새로운 Slab에서 다시 할당 시도
}

// 메모리 해제 함수 구현
void CustomAllocator::free(void* object, size_t size) {
    EnterCriticalSection(&criticalSection);  // CRITICAL_SECTION 잠금

    if (size > objectSize) {
        LeaveCriticalSection(&criticalSection);
        std::cerr << "Error: Deallocating invalid object!" << std::endl;
        return;
    }

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
CustomAllocator::~CustomAllocator() {
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
    CustomAllocator* allocator = CustomAllocator::Instance();  // Singleton 인스턴스 가져오기

    void* obj1 = allocator->allocate(64);  // 객체 할당
    void* obj2 = allocator->allocate(64);  // 또 다른 객체 할당

    allocator->free(obj1, 64);  // 첫 번째 객체 해제
    allocator->free(obj2, 64);  // 두 번째 객체 해제

    return 0;
}
