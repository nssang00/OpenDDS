#include <iostream>
#include <vector>
#include <list>
#include <map>
#include <windows.h>

class SlabAllocator {
public:
    SlabAllocator();
    ~SlabAllocator();

    void* allocate(size_t size);
    void free(void* ptr, size_t size);

    static SlabAllocator* Instance();

private:
    struct Slab;
    struct SlabCache {
        size_t blockSize;
        size_t objectsPerSlab;
        std::vector<Slab*> slabs;

        SlabCache(size_t size);
        ~SlabCache();
    };

    struct Slab {
        unsigned char* data;
        size_t blockSize;
        size_t capacity;
        size_t freeCount;
        std::list<size_t> freeList;

        Slab(size_t blkSize, size_t capacity);
        ~Slab();
        void* allocate();
        void deallocate(void* ptr);
    };

    static const size_t MAX_SMALL_OBJECT_SIZE = 256;
    static const size_t NUM_SMALL_OBJECT_CACHES = MAX_SMALL_OBJECT_SIZE / 8;

    std::vector<SlabCache*> smallObjectCaches;
    SlabCache* largeObjectCache;
    CRITICAL_SECTION cs;

    SlabCache* getCache(size_t size);
    Slab* createSlab(size_t size);
    void cleanup();
};

SlabAllocator::SlabCache::SlabCache(size_t size)
    : blockSize(size), objectsPerSlab(1024 / size) {}

SlabAllocator::SlabCache::~SlabCache() {
    for (size_t i = 0; i < slabs.size(); ++i) {
        delete slabs[i];
    }
}

SlabAllocator::Slab::Slab(size_t blkSize, size_t cap)
    : blockSize(blkSize), capacity(cap), freeCount(cap) {
    data = new unsigned char[blkSize * cap];
    for (size_t i = 0; i < cap; ++i) {
        freeList.push_back(i);
    }
}

SlabAllocator::Slab::~Slab() {
    delete[] data;
}

void* SlabAllocator::Slab::allocate() {
    if (freeCount > 0) {
        size_t index = freeList.front();
        freeList.pop_front();
        --freeCount;
        return data + index * blockSize;
    }
    return nullptr;
}

void SlabAllocator::Slab::deallocate(void* ptr) {
    size_t index = ((unsigned char*)ptr - data) / blockSize;
    if (index < capacity) {
        freeList.push_back(index);
        ++freeCount;
    }
}

SlabAllocator::SlabAllocator()
    : largeObjectCache(new SlabCache(0)) {
    InitializeCriticalSection(&cs);

    smallObjectCaches.resize(NUM_SMALL_OBJECT_CACHES);
    for (size_t i = 0; i < NUM_SMALL_OBJECT_CACHES; ++i) {
        smallObjectCaches[i] = new SlabCache((i + 1) * 8);
    }
}

SlabAllocator::~SlabAllocator() {
    cleanup();
    DeleteCriticalSection(&cs);
}

SlabAllocator* SlabAllocator::Instance() {
    static SlabAllocator instance;
    return &instance;
}

void* SlabAllocator::allocate(size_t size) {
    EnterCriticalSection(&cs);
    SlabCache* cache = getCache(size);
    for (size_t i = 0; i < cache->slabs.size(); ++i) {
        if (cache->slabs[i]->freeCount > 0) {
            void* result = cache->slabs[i]->allocate();
            LeaveCriticalSection(&cs);
            return result;
        }
    }

    Slab* newSlab = createSlab(size);
    cache->slabs.push_back(newSlab);
    void* result = newSlab->allocate();
    LeaveCriticalSection(&cs);
    return result;
}

void SlabAllocator::free(void* ptr, size_t size) {
    EnterCriticalSection(&cs);
    SlabCache* cache = getCache(size);
    for (size_t i = 0; i < cache->slabs.size(); ++i) {
        Slab* slab = cache->slabs[i];
        if (slab->data <= (unsigned char*)ptr && (unsigned char*)ptr < slab->data + slab->blockSize * slab->capacity) {
            slab->deallocate(ptr);
            break;
        }
    }
    LeaveCriticalSection(&cs);
}

SlabAllocator::SlabCache* SlabAllocator::getCache(size_t size) {
    if (size <= MAX_SMALL_OBJECT_SIZE) {
        size_t index = (size - 1) / 8;
        return smallObjectCaches[index];
    }
    return largeObjectCache;
}

SlabAllocator::Slab* SlabAllocator::createSlab(size_t size) {
    size_t capacity = 1024 / size;
    return new Slab(size, capacity);
}

void SlabAllocator::cleanup() {
    for (size_t i = 0; i < smallObjectCaches.size(); ++i) {
        delete smallObjectCaches[i];
    }
    smallObjectCaches.clear();
    delete largeObjectCache;
}
