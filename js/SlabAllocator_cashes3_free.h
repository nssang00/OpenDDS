#include <iostream>
#include <vector>
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

struct BlockHeader {
    size_t size;
};

void* SlabAllocator::allocate(size_t size) {
    SlabCache* cache = getCache(size);

    EnterCriticalSection(&cs);
    for (size_t i = 0; i < cache->slabs.size(); ++i) {
        Slab* slab = cache->slabs[i];
        if (slab->freeCount > 0) {
            void* result = slabAllocate(slab);
            if (result) {
                // 블록 크기를 헤더에 저장
                BlockHeader* header = reinterpret_cast<BlockHeader*>(result);
                header->size = size;
                return header + 1; // 헤더를 건너뛰고 실제 데이터 시작
            }
        }
    }

    Slab* newSlab = createSlab(size + sizeof(BlockHeader));
    cache->slabs.push_back(newSlab);
    LeaveCriticalSection(&cs);

    return allocate(size); // 재귀 호출
}

void SlabAllocator::free(void* ptr, size_t) {
    BlockHeader* header = reinterpret_cast<BlockHeader*>(ptr) - 1;
    size_t size = header->size;
    
    SlabCache* cache = getCache(size);

    EnterCriticalSection(&cs);
    BlockHeader* header = reinterpret_cast<BlockHeader*>(ptr) - 1;
    size_t blockSize = header->size;

    for (size_t i = 0; i < cache->slabs.size(); ++i) {
        Slab* slab = cache->slabs[i];
        if (slab->data <= (unsigned char*)ptr && (unsigned char*)ptr < slab->data + slab->blockSize * slab->capacity) {
            slabDeallocate(slab, ptr);
            break;
        }
    }
    LeaveCriticalSection(&cs);
}

SlabAllocator::SlabCache* SlabAllocator::getCache(size_t size) {
    size_t index = size;
    if (index >= caches.size()) {
        caches.resize(index + 1, nullptr);
    }
    if (!caches[index]) {
        caches[index] = new SlabCache(size);
    }
    return caches[index];
}

SlabAllocator::Slab* SlabAllocator::createSlab(size_t size) {
    size_t capacity = 1024;
    size_t alignedSize = (size + 63) & ~63; // 캐시 라인 크기 맞춤
    return new Slab(alignedSize, capacity);
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
    freeList.reserve(cap); // 필요한 용량만큼 미리 할당
    for (size_t i = 0; i < cap; ++i) {
        freeList.push_back(i);
    }
}

SlabAllocator::Slab::~Slab() {
    delete[] data;
}
