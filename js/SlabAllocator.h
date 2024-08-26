#include <iostream>
#include <vector>
#include <map>
#include <algorithm> // For std::fill
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
        bool* freeMap;

        Slab(size_t blkSize, size_t capacity);
        ~Slab();
        void* allocate();
        void deallocate(void* ptr);
    };

    struct SlabCache {
        size_t blockSize;
        std::vector<Slab*> slabs;

        SlabCache(size_t size) : blockSize(size) {}
        ~SlabCache();
    };

    std::map<size_t, SlabCache*> caches;
    CRITICAL_SECTION cs; // 크리티컬 섹션 추가

    SlabCache* getCache(size_t size);
    Slab* createSlab(size_t size);
};

SlabAllocator::SlabAllocator() {
    InitializeCriticalSection(&cs); // 크리티컬 섹션 초기화
}

SlabAllocator::~SlabAllocator() {
    for (std::map<size_t, SlabCache*>::iterator it = caches.begin(); it != caches.end(); ++it) {
        delete it->second;
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
        if (cache->slabs[i]->freeCount > 0) {
            void* result = cache->slabs[i]->allocate();
            LeaveCriticalSection(&cs); // 크리티컬 섹션 종료
            return result;
        }
    }

    Slab* newSlab = createSlab(size);
    cache->slabs.push_back(newSlab);
    void* result = newSlab->allocate();
    LeaveCriticalSection(&cs); // 크리티컬 섹션 종료
    return result;
}

void SlabAllocator::free(void* ptr, size_t size) {
    EnterCriticalSection(&cs); // 크리티컬 섹션 진입
    SlabCache* cache = getCache(size);
    for (size_t i = 0; i < cache->slabs.size(); ++i) {
        Slab* slab = cache->slabs[i];
        if (slab->data <= (unsigned char*)ptr && (unsigned char*)ptr < slab->data + slab->blockSize * slab->capacity) {
            slab->deallocate(ptr);
            break;
        }
    }
    LeaveCriticalSection(&cs); // 크리티컬 섹션 종료
}

SlabAllocator::SlabCache* SlabAllocator::getCache(size_t size) {
    std::map<size_t, SlabCache*>::iterator it = caches.find(size);
    if (it != caches.end()) {
        return it->second;
    }

    SlabCache* newCache = new SlabCache(size);
    caches[size] = newCache;
    return newCache;
}

SlabAllocator::Slab* SlabAllocator::createSlab(size_t size) {
    size_t capacity = 1024; // 1024 objects per slab
    return new Slab(size, capacity);
}

SlabAllocator::SlabCache::~SlabCache() {
    for (size_t i = 0; i < slabs.size(); ++i) {
        delete slabs[i];
    }
}

SlabAllocator::Slab::Slab(size_t blkSize, size_t cap)
    : blockSize(blkSize), capacity(cap), freeCount(cap) {
    data = new unsigned char[blkSize * cap];
    freeMap = new bool[cap];
    std::fill(freeMap, freeMap + cap, true);
}

SlabAllocator::Slab::~Slab() {
    delete[] data;
    delete[] freeMap;
}

void* SlabAllocator::Slab::allocate() {
    for (size_t i = 0; i < capacity; ++i) {
        if (freeMap[i]) {
            freeMap[i] = false;
            --freeCount;
            return data + i * blockSize;
        }
    }
    return nullptr;
}

void SlabAllocator::Slab::deallocate(void* ptr) {
    size_t index = ((unsigned char*)ptr - data) / blockSize;
    if (!freeMap[index]) {
        freeMap[index] = true;
        ++freeCount;
    }
}
