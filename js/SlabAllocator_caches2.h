#include <iostream>
#include <vector>
#include <list> // For std::list
#include <windows.h> // Windows API 헤더 추가

class SlabAllocator {
public:
    SlabAllocator();
    ~SlabAllocator();

    void* allocate(size_t size);
    void free(void* ptr, size_t size);

    static SlabAllocator* Instance();

private:
    struct Slab {
        unsigned char* data;
        size_t blockSize;
        size_t capacity;
        size_t freeCount;
        std::vector<size_t> freeList; // std::vector로 변경

        Slab(size_t blkSize, size_t capacity);
        ~Slab();
    };

    struct SlabCache {
        size_t blockSize;
        std::vector<Slab*> slabs;

        SlabCache(size_t size) : blockSize(size) {}
        ~SlabCache();
    };

    std::vector<SlabCache*> caches;
    CRITICAL_SECTION cs; // 크리티컬 섹션 추가

    SlabCache* getCache(size_t size);
    Slab* createSlab(size_t size);
    void* slabAllocate(Slab* slab);
    void slabDeallocate(Slab* slab, void* ptr);
};

SlabAllocator::SlabAllocator() {
    InitializeCriticalSection(&cs); // 크리티컬 섹션 초기화
}

SlabAllocator::~SlabAllocator() {
    for (size_t i = 0; i < caches.size(); ++i) {
        delete caches[i];
    }
    DeleteCriticalSection(&cs); // 크리티컬 섹션 삭제
}

SlabAllocator* SlabAllocator::Instance() {
    static SlabAllocator instance;
    return &instance;
}

void* SlabAllocator::allocate(size_t size) {
    EnterCriticalSection(&cs); // 크리티컬 섹션 진입
    SlabCache* cache = getCache(size);
    for (size_t i = 0; i < cache->slabs.size(); ++i) {
        Slab* slab = cache->slabs[i];
        if (slab->freeCount > 0) {
            void* result = slabAllocate(slab);
            LeaveCriticalSection(&cs); // 크리티컬 섹션 종료
            return result;
        }
    }

    Slab* newSlab = createSlab(size);
    cache->slabs.push_back(newSlab);
    void* result = slabAllocate(newSlab);
    LeaveCriticalSection(&cs); // 크리티컬 섹션 종료
    return result;
}

void SlabAllocator::free(void* ptr, size_t size) {
    EnterCriticalSection(&cs); // 크리티컬 섹션 진입
    SlabCache* cache = getCache(size);
    for (size_t i = 0; i < cache->slabs.size(); ++i) {
        Slab* slab = cache->slabs[i];
        if (slab->data <= (unsigned char*)ptr && (unsigned char*)ptr < slab->data + slab->blockSize * slab->capacity) {
            slabDeallocate(slab, ptr);
            break;
        }
    }
    LeaveCriticalSection(&cs); // 크리티컬 섹션 종료
}

SlabAllocator::SlabCache* SlabAllocator::getCache(size_t size) {
    size_t index = size; // size를 인덱스로 사용하기 위한 예제
    if (index >= caches.size()) {
        caches.resize(index + 1, nullptr);
    }
    if (!caches[index]) {
        caches[index] = new SlabCache(size);
    }
    return caches[index];
}

SlabAllocator::Slab* SlabAllocator::createSlab(size_t size) {
    size_t capacity = 1024; // 1024 objects per slab
    return new Slab(size, capacity);
}

void* SlabAllocator::slabAllocate(Slab* slab) {
    if (slab->freeCount > 0) {
        size_t index = slab->freeList.back();
        slab->freeList.pop_back();
        --slab->freeCount;
        return slab->data + index * slab->blockSize;
    }
    return nullptr;
}

void SlabAllocator::slabDeallocate(Slab* slab, void* ptr) {
    size_t index = ((unsigned char*)ptr - slab->data) / slab->blockSize;
    if (index < slab->capacity) {
        slab->freeList.push_back(index);
        ++slab->freeCount;
    }
}

SlabAllocator::SlabCache::~SlabCache() {
    for (size_t i = 0; i < slabs.size(); ++i) {
        delete slabs[i];
    }
}

SlabAllocator::Slab::Slab(size_t blkSize, size_t cap)
    : blockSize(blkSize), capacity(cap), freeCount(cap) {
    data = new unsigned char[blkSize * cap];
    freeList.reserve(cap); // 예비 메모리 예약
    for (size_t i = 0; i < cap; ++i) {
        freeList.push_back(i);
    }
}

SlabAllocator::Slab::~Slab() {
    delete[] data;
}
