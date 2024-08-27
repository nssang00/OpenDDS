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
    struct Slab;
    struct SlabCache {
        size_t blockSize;
        size_t objectsPerSlab;
        std::vector<Slab*> slabs;

        SlabCache(size_t size) : blockSize(size), objectsPerSlab(1024 / size) {}
        ~SlabCache();
    };

    struct Slab {
        unsigned char* data;
        size_t blockSize;
        size_t capacity;
        size_t freeCount;
        std::list<size_t> freeList; // 빈 블록 인덱스 관리

        Slab(size_t blkSize, size_t capacity);
        ~Slab();
        void* allocate();
        void deallocate(void* ptr);
    };

    static const size_t MAX_SMALL_OBJECT_SIZE = 256;
    static const size_t NUM_SMALL_OBJECT_CACHES = MAX_SMALL_OBJECT_SIZE / 8;

    std::vector<SlabCache*> smallObjectCaches;
    SlabCache largeObjectCache;
    CRITICAL_SECTION cs; // 크리티컬 섹션 추가

    SlabCache* getCache(size_t size);
    Slab* createSlab(size_t size);

    // 삭제된 리소스와 메모리 관리
    void cleanup();
};

SlabAllocator::SlabAllocator() 
    : largeObjectCache(0) // 큰 객체를 위한 SlabCache 초기화
{
    InitializeCriticalSection(&cs); // 크리티컬 섹션 초기화
    smallObjectCaches.resize(NUM_SMALL_OBJECT_CACHES);
    for (size_t i = 0; i < NUM_SMALL_OBJECT_CACHES; ++i) {
        smallObjectCaches[i] = new SlabCache((i + 1) * 8);
    }
}

SlabAllocator::~SlabAllocator() {
    cleanup();
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
    if (size <= MAX_SMALL_OBJECT_SIZE) {
        size_t index = (size - 1) / 8;
        return smallObjectCaches[index];
    }
    return &largeObjectCache;
}

SlabAllocator::Slab* SlabAllocator::createSlab(size_t size) {
    size_t capacity = 1024 / size; // Slab 당 최대 객체 수
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

void SlabAllocator::cleanup() {
    for (auto cache : smallObjectCaches) {
        delete cache;
    }
    smallObjectCaches.clear();
    delete largeObjectCache;
}
