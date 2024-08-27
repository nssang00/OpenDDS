#include <iostream>
#include <vector>
#include <map>
#include <windows.h> // Windows API 헤더

class SlabAllocator {
public:
    SlabAllocator();
    ~SlabAllocator();

    void* allocate(size_t size);
    void free(void* ptr);

    static SlabAllocator* Instance();

private:
    struct Slab {
        unsigned char* data;
        size_t blockSize;
        size_t capacity;
        size_t freeCount;
        std::vector<size_t> freeList;

        Slab(size_t blkSize, size_t capacity);
        ~Slab();
    };

    struct SlabCache {
        size_t blockSize;
        std::vector<Slab*> slabs;
        std::map<void*, Slab*> slabMap; // 시작 주소 -> 슬랩의 매핑

        SlabCache(size_t size) : blockSize(size) {}
        ~SlabCache();
    };

    std::vector<SlabCache*> caches;
    CRITICAL_SECTION cs;

    SlabCache* getCache(size_t size);
    Slab* createSlab(size_t size);
    void* slabAllocate(Slab* slab);
    void slabDeallocate(Slab* slab, void* ptr);
};

SlabAllocator::SlabAllocator() {
    InitializeCriticalSectionAndSpinCount(&cs, 4000); // 크리티컬 섹션 초기화 및 스핀락 설정
}

SlabAllocator::~SlabAllocator() {
    for (size_t i = 0; i < caches.size(); ++i) {
        delete caches[i];
    }
    DeleteCriticalSection(&cs);
}

SlabAllocator* SlabAllocator::Instance() {
    static SlabAllocator instance;
    return &instance;
}

void* SlabAllocator::allocate(size_t size) {
    SlabCache* cache = getCache(size);

    EnterCriticalSection(&cs);
    for (size_t i = 0; i < cache->slabs.size(); ++i) {
        Slab* slab = cache->slabs[i];
        if (slab->freeCount > 0) {
            void* result = slabAllocate(slab);
            LeaveCriticalSection(&cs);
            return result;
        }
    }

    Slab* newSlab = createSlab(size);
    cache->slabs.push_back(newSlab);
    cache->slabMap[newSlab->data] = newSlab; // 슬랩의 시작 주소를 매핑
    LeaveCriticalSection(&cs);

    return slabAllocate(newSlab);
}

void SlabAllocator::free(void* ptr) {
    if (ptr == NULL) return; // nullptr 대신 NULL 사용

    EnterCriticalSection(&cs);
    for (size_t i = 0; i < caches.size(); ++i) {
        SlabCache* cache = caches[i];
        std::map<void*, Slab*>::iterator it = cache->slabMap.lower_bound(ptr);
        if (it != cache->slabMap.end() && (unsigned char*)ptr < (unsigned char*)it->first + it->second->blockSize * it->second->capacity) {
            // 슬랩의 범위 내에 속한 ptr을 찾음
            slabDeallocate(it->second, ptr);
