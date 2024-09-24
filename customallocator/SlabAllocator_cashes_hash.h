#include <iostream>
#include <vector>
#include <map> // unordered_map 대신 map 사용
#include <windows.h>

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

        Slab(size_t blkSize, size_t cap);
        ~Slab();
    };

    struct SlabCache {
        size_t blockSize;
        std::vector<Slab*> slabs;

        SlabCache(size_t size) : blockSize(size) {}
        ~SlabCache();
    };

    std::vector<SlabCache*> caches;
    std::map<void*, size_t> blockSizes; // unordered_map 대신 map 사용
    CRITICAL_SECTION cs;

    SlabCache* getCache(size_t size);
    Slab* createSlab(size_t size);
    void* slabAllocate(Slab* slab);
    void slabDeallocate(Slab* slab, void* ptr);
};

SlabAllocator::SlabAllocator() {
    InitializeCriticalSectionAndSpinCount(&cs, 4000);
}

SlabAllocator::~SlabAllocator() {
    for (size_t i = 0; i < caches.size(); ++i) { // auto 대신 명시적 타입 사용
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
    for (size_t i = 0; i < cache->slabs.size(); ++i) { // auto 대신 명시적 타입 사용
        Slab* slab = cache->slabs[i];
        if (slab->freeCount > 0) {
            void* result = slabAllocate(slab);
            if (result) {
                blockSizes[result] = size; // 크기 정보를 저장
            }
            LeaveCriticalSection(&cs);
            return result;
        }
    }

    Slab* newSlab = createSlab(size);
    cache->slabs.push_back(newSlab);
    LeaveCriticalSection(&cs);

    return slabAllocate(newSlab);
}

void SlabAllocator::free(void* ptr) {
    EnterCriticalSection(&cs);
    std::map<void*, size_t>::iterator it = blockSizes.find(ptr);
    if (it != blockSizes.end()) {
        size_t size = it->second;
        blockSizes.erase(it);
        SlabCache* cache = getCache(size);
        for (size_t i = 0; i < cache->slabs.size(); ++i) { // auto 대신 명시적 타입 사용
            Slab* slab = cache->slabs[i];
            if (slab->data <= (unsigned char*)ptr && (unsigned char*)ptr < slab->data + slab->blockSize * slab->capacity) {
                slabDeallocate(slab, ptr);
                break;
            }
        }
    }
    LeaveCriticalSection(&cs);
}

SlabAllocator::SlabCache* SlabAllocator::getCache(size_t size) {
    size_t index = size;
    if (index >= caches.size()) {
        caches.resize(index + 1, NULL); // nullptr 대신 NULL 사용
    }
    if (!caches[index]) {
        caches[index] = new SlabCache(size);
    }
    return caches[index];
}

SlabAllocator::Slab* SlabAllocator::createSlab(size_t size) {
    size_t capacity = 1024;
    size_t alignedSize = (size + 63) & ~63;
    return new Slab(alignedSize, capacity);
}

void* SlabAllocator::slabAllocate(Slab* slab) {
    if (slab->freeCount > 0) {
        size_t index = slab->freeList.back();
        slab->freeList.pop_back();
        --slab->freeCount;
        return slab->data + index * slab->blockSize;
    }
    return NULL; // nullptr 대신 NULL 사용
}

void SlabAllocator::slabDeallocate(Slab* slab, void* ptr) {
    size_t index = ((unsigned char*)ptr - slab->data) / slab->blockSize;
    if (index < slab->capacity) {
        slab->freeList.push_back(index);
        ++slab->freeCount;
    }
}

SlabAllocator::SlabCache::~SlabCache() {
    for (size_t i = 0; i < slabs.size(); ++i) { // auto 대신 명시적 타입 사용
        delete slabs[i];
    }
}

SlabAllocator::Slab::Slab(size_t blkSize, size_t cap)
    : blockSize(blkSize), capacity(cap), freeCount(cap) {
    data = new unsigned char[blkSize * cap];
    freeList.reserve(cap);
    for (size_t i = 0; i < cap; ++i) {
        freeList.push_back(i);
    }
}

SlabAllocator::Slab::~Slab() {
    delete[] data;
}
