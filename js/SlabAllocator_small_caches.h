#include <iostream>
#include <vector>
#include <list>
#include <windows.h> // Windows API 헤더 추가

#define MAX_SMALL_OBJECT_SIZE 256
#define SMALL_OBJECT_CACHE_SIZE 32 // 캐시 배열 크기
#define SLAB_CAPACITY 1024 // 슬랩의 용량

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
        std::vector<Slab*> slabs;

        SlabCache(size_t size) : blockSize(size) {}
        ~SlabCache();
    };

    struct Slab {
        unsigned char* data;
        size_t blockSize;
        size_t capacity;
        size_t freeCount;
        std::list<size_t> freeList;

        Slab(size_t blkSize, size_t cap);
        ~Slab();
        void* allocate();
        void deallocate(void* ptr);
    };

    SlabCache* getCache(size_t size);
    Slab* createSlab(size_t size);
    SlabCache* small_object_caches[SMALL_OBJECT_CACHE_SIZE];
    SlabCache* large_object_cache;
    CRITICAL_SECTION cs;

    SlabCache* getSmallObjectCache(size_t size);
    SlabCache* getLargeObjectCache();
};

SlabAllocator::SlabAllocator() {
    InitializeCriticalSection(&cs); // 크리티컬 섹션 초기화

    // 작은 객체 캐시 초기화
    for (size_t i = 0; i < SMALL_OBJECT_CACHE_SIZE; ++i) {
        small_object_caches[i] = NULL;
    }
    large_object_cache = NULL;
}

SlabAllocator::~SlabAllocator() {
    for (size_t i = 0; i < SMALL_OBJECT_CACHE_SIZE; ++i) {
        delete small_object_caches[i];
    }
    delete large_object_cache;
    DeleteCriticalSection(&cs); // 크리티컬 섹션 삭제
}

SlabAllocator* SlabAllocator::Instance() {
    static SlabAllocator instance;
    return &instance;
}

void* SlabAllocator::allocate(size_t size) {
    EnterCriticalSection(&cs); // 크리티컬 섹션 진입
    SlabCache* cache = getCache(size);

    // 슬랩에서 할당
    for (size_t i = 0; i < cache->slabs.size(); ++i) {
        Slab* slab = cache->slabs[i];
        if (slab->freeCount > 0) {
            void* result = slab->allocate();
            LeaveCriticalSection(&cs); // 크리티컬 섹션 종료
            return result;
        }
    }

    // 새로운 슬랩 생성
    Slab* newSlab = createSlab(size);
    cache->slabs.push_back(newSlab);
    void* result = newSlab->allocate();
    LeaveCriticalSection(&cs); // 크리티컬 섹션 종료
    return result;
}

void SlabAllocator::free(void* ptr, size_t size) {
    EnterCriticalSection(&cs); // 크리티컬 섹션 진입
    SlabCache* cache = getCache(size);

    // 슬랩에서 해제
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
        return getSmallObjectCache(size);
    }
    return getLargeObjectCache();
}

SlabAllocator::SlabCache* SlabAllocator::getSmallObjectCache(size_t size) {
    size_t index = (size + 7) / 8 - 1; // 8바이트 단위로 캐시를 구분
    if (index >= SMALL_OBJECT_CACHE_SIZE) {
        return getLargeObjectCache();
    }
    if (!small_object_caches[index]) {
        small_object_caches[index] = new SlabCache((index + 1) * 8);
    }
    return small_object_caches[index];
}

SlabAllocator::SlabCache* SlabAllocator::getLargeObjectCache() {
    if (!large_object_cache) {
        large_object_cache = new SlabCache(MAX_SMALL_OBJECT_SIZE + 1);
    }
    return large_object_cache;
}

SlabAllocator::Slab* SlabAllocator::createSlab(size_t size) {
    return new Slab(size, SLAB_CAPACITY); // 조정된 슬랩 용량
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
    return NULL; // nullptr 대신 NULL 사용
}

void SlabAllocator::Slab::deallocate(void* ptr) {
    size_t index = ((unsigned char*)ptr - data) / blockSize;
    if (index < capacity) {
        freeList.push_back(index);
        ++freeCount;
    }
}
