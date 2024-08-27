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

void* SlabAllocator::allocate(size_t size) {
    size_t totalSize = size + sizeof(size_t);
    SlabCache* cache = getCache(totalSize);

    EnterCriticalSection(&cs);
    void* result = nullptr;
    
    for (size_t i = 0; i < cache->slabs.size(); ++i) {
        Slab* slab = cache->slabs[i];
        if (slab->freeCount > 0) {
            result = slabAllocate(slab);
            if (result) {
                *(size_t*)result = size; // 메타데이터에 블록 크기 저장
                result = (void*)((char*)result + sizeof(size_t)); // 사용자에게 메타데이터를 건너뛴 위치 반환
                LeaveCriticalSection(&cs);
                return result;
            }
        }
    }

    // 새로운 슬랩을 생성하여 추가
    Slab* newSlab = createSlab(totalSize);
    cache->slabs.push_back(newSlab);
    LeaveCriticalSection(&cs);

    result = slabAllocate(newSlab);
    if (result) {
        *(size_t*)result = size; // 메타데이터에 블록 크기 저장
        result = (void*)((char*)result + sizeof(size_t)); // 사용자에게 메타데이터를 건너뛴 위치 반환
    }

    return result;
}

void SlabAllocator::free(void* ptr) {
    if (ptr == nullptr) return;

    void* rawPtr = (void*)((char*)ptr - sizeof(size_t)); // 메타데이터 위치로 포인터 이동
    size_t size = *(size_t*)rawPtr; // 메타데이터에서 크기 읽기
    SlabCache* cache = getCache(size + sizeof(size_t));

    EnterCriticalSection(&cs);
    for (size_t i = 0; i < cache->slabs.size(); ++i) {
        Slab* slab = cache->slabs[i];
        if (slab->data <= (unsigned char*)rawPtr && (unsigned char*)rawPtr < slab->data + slab->blockSize * slab->capacity) {
            slabDeallocate(slab, rawPtr);
            LeaveCriticalSection(&cs);
            return;
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
