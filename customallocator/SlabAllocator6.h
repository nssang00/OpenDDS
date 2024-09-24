#include <iostream>
#include <vector>
#include <windows.h>  // For CRITICAL_SECTION

class CustomAllocator {
public:
    static CustomAllocator* Instance(int num = 0);

    void* allocate(size_t size);
    void free(void* object, size_t size);

    ~CustomAllocator();

private:
    CustomAllocator(size_t objectSize = 64, size_t slabSize = 100);

    struct Slab {
        void* start;
        std::vector<void*> freeList;
    };

    size_t objectSize;
    size_t slabSize;
    std::vector<Slab> slabs;

    CRITICAL_SECTION criticalSection;

    static CustomAllocator* instance[2];

    void createNewSlab();

    bool isPointerInSlab(void* object, Slab& slab) {
        char* start = static_cast<char*>(slab.start);
        char* end = start + slabSize * objectSize;
        char* ptr = static_cast<char*>(object);
        return (ptr >= start && ptr < end);
    }
};

CustomAllocator* CustomAllocator::instance[2] = { NULL, NULL };

CustomAllocator::CustomAllocator(size_t objectSize, size_t slabSize)
    : objectSize(objectSize), slabSize(slabSize) {
    InitializeCriticalSection(&criticalSection);
    createNewSlab();
}

void CustomAllocator::createNewSlab() {
    EnterCriticalSection(&criticalSection);

    Slab newSlab;
    newSlab.start = operator new(slabSize * objectSize);

    for (size_t i = 0; i < slabSize; ++i) {
        void* block = static_cast<char*>(newSlab.start) + i * objectSize;
        newSlab.freeList.push_back(block);
    }

    slabs.push_back(newSlab);

    LeaveCriticalSection(&criticalSection);
}

CustomAllocator* CustomAllocator::Instance(int num) {
    if (!instance[num]) {
        instance[num] = new CustomAllocator();
    }
    return instance[num];
}

void* CustomAllocator::allocate(size_t size) {
    EnterCriticalSection(&criticalSection);

    if (size > objectSize) {
        LeaveCriticalSection(&criticalSection);
        return NULL;
    }

    for (std::vector<Slab>::iterator it = slabs.begin(); it != slabs.end(); ++it) {
        Slab& slab = *it;
        if (!slab.freeList.empty()) {
            void* object = slab.freeList.back();
            slab.freeList.pop_back();
            LeaveCriticalSection(&criticalSection);
            return object;
        }
    }

    createNewSlab();
    LeaveCriticalSection(&criticalSection);
    return allocate(size);
}

void CustomAllocator::free(void* object, size_t size) {
    EnterCriticalSection(&criticalSection);

    if (size > objectSize) {
        LeaveCriticalSection(&criticalSection);
        std::cerr << "Error: Deallocating invalid object!" << std::endl;
        return;
    }

    for (std::vector<Slab>::iterator it = slabs.begin(); it != slabs.end(); ++it) {
        Slab& slab = *it;
        if (isPointerInSlab(object, slab)) {
            // 이미 freeList에 존재하는지 확인
            if (std::find(slab.freeList.begin(), slab.freeList.end(), object) == slab.freeList.end()) {
                slab.freeList.push_back(object);  // 블록 해제
            } else {
                std::cerr << "Error: Double free detected!" << std::endl;
            }
            LeaveCriticalSection(&criticalSection);
            return;
        }
    }

    std::cerr << "Error: Deallocating invalid object!" << std::endl;
    LeaveCriticalSection(&criticalSection);
}

CustomAllocator::~CustomAllocator() {
    EnterCriticalSection(&criticalSection);

    for (std::vector<Slab>::iterator it = slabs.begin(); it != slabs.end(); ++it) {
        Slab& slab = *it;
        operator delete(slab.start);
    }

    slabs.clear();
    LeaveCriticalSection(&criticalSection);
    DeleteCriticalSection(&criticalSection);
}

int main() {
    CustomAllocator* allocator = CustomAllocator::Instance();

    void* obj1 = allocator->allocate(64);
    void* obj2 = allocator->allocate(64);

    allocator->free(obj1, 64);
    allocator->free(obj2, 64);

    // 아래는 오류를 유발하는 예시입니다.
    // 이미 해제된 블록을 다시 해제하려고 하면 에러 메시지를 출력합니다.
    allocator->free(obj1, 64);  // Double free 발생

    return 0;
}
