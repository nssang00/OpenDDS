#include <iostream>
#include <windows.h>

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
        size_t freeList[1024];
        size_t freeListSize;
        Slab(size_t blkSize, size_t capacity);
        ~Slab();
    };

    struct SlabCache {
        size_t blockSize;
        Slab* slabs[64];
        size_t slabCount;
        SlabCache(size_t size) : blockSize(size), slabCount(0) {}
        ~SlabCache();
    };

    SlabCache* caches[256];
    size_t cacheCount;
    CRITICAL_SECTION cs;

    SlabCache* getCache(size_t size);
    Slab* createSlab(size_t size);
    inline void* slabAllocate(Slab* slab);
    inline void slabDeallocate(Slab* slab, void* ptr);
};

SlabAllocator::SlabAllocator() : cacheCount(0) {
    InitializeCriticalSection(&cs);
    memset(caches, 0, sizeof(caches));
}

SlabAllocator::~SlabAllocator() {
    for (size_t i = 0; i < cacheCount; ++i) {
        delete caches[i];
    }
    DeleteCriticalSection(&cs);
}

SlabAllocator* SlabAllocator::Instance() {
    static SlabAllocator instance;
    return &instance;
}

void* SlabAllocator::allocate(size_t size) {
    size = (size + 7) & ~7; // 8바이트 단위로 정렬
    EnterCriticalSection(&cs);
    SlabCache* cache = getCache(size);
    for (size_t i = 0; i < cache->slabCount; ++i) {
        Slab* slab = cache->slabs[i];
        if (slab->freeCount > 0) {
            void* result = slabAllocate(slab);
            LeaveCriticalSection(&cs);
            return result;
        }
    }
    Slab* newSlab = createSlab(size);
    cache->slabs[cache->slabCount++] = newSlab;
    void* result = slabAllocate(newSlab);
    LeaveCriticalSection(&cs);
    return result;
}

void SlabAllocator::free(void* ptr, size_t size) {
    size = (size + 7) & ~7; // 8바이트 단위로 정렬
    EnterCriticalSection(&cs);
    SlabCache* cache = getCache(size);
    for (size_t i = 0; i < cache->slabCount; ++i) {
        Slab* slab = cache->slabs[i];
        if (slab->data <= (unsigned char*)ptr && (unsigned char*)ptr < slab->data + slab->blockSize * slab->capacity) {
            slabDeallocate(slab, ptr);
            break;
        }
    }
    LeaveCriticalSection(&cs);
}

SlabAllocator::SlabCache* SlabAllocator::getCache(size_t size) {
    size_t index = (size + 7) / 8 - 1;
    if (index >= cacheCount) {
        for (size_t i = cacheCount; i <= index; ++i) {
            caches[i] = new SlabCache((i + 1) * 8);
        }
        cacheCount = index + 1;
    }
    return caches[index];
}

SlabAllocator::Slab* SlabAllocator::createSlab(size_t size) {
    size_t capacity = 1024;
    return new Slab(size, capacity);
}

inline void* SlabAllocator::slabAllocate(Slab* slab) {
    if (slab->freeCount > 0) {
        size_t index = slab->freeList[--slab->freeListSize];
        --slab->freeCount;
        return slab->data + index * slab->blockSize;
    }
    return NULL;
}

inline void SlabAllocator::slabDeallocate(Slab* slab, void* ptr) {
    size_t index = ((unsigned char*)ptr - slab->data) / slab->blockSize;
    if (index < slab->capacity) {
        slab->freeList[slab->freeListSize++] = index;
        ++slab->freeCount;
    }
}

SlabAllocator::SlabCache::~SlabCache() {
    for (size_t i = 0; i < slabCount; ++i) {
        delete slabs[i];
    }
}

SlabAllocator::Slab::Slab(size_t blkSize, size_t cap)
    : blockSize(blkSize), capacity(cap), freeCount(cap), freeListSize(cap) {
    data = new unsigned char[blkSize * cap];
    for (size_t i = 0; i < cap; ++i) {
        freeList[i] = i;
    }
}

SlabAllocator::Slab::~Slab() {
    delete[] data;
}

// 테스트 코드
int main() {
    SlabAllocator* allocator = SlabAllocator::Instance();

    void* ptr1 = allocator->allocate(10);
    void* ptr2 = allocator->allocate(20);
    void* ptr3 = allocator->allocate(30);

    allocator->free(ptr1, 10);
    allocator->free(ptr2, 20);
    allocator->free(ptr3, 30);

    std::cout << "SlabAllocator test completed." << std::endl;

    return 0;
}
