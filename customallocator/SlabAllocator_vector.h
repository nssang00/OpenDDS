#include <cstddef>
#include <vector>
#include <cstdlib>
#include <cassert>

class SlabAllocator {
public:
    SlabAllocator();
    ~SlabAllocator();

    void* allocate(size_t size);
    void free(void* ptr);

    static SlabAllocator* Instance();

private:
    struct Slab {
        Slab* next;
    };

    struct SlabCache {
        size_t objectSize;
        Slab* freeList;
        std::vector<void*> slabs;
    };

    std::vector<SlabCache*> slabCaches;

    SlabCache* getCache(size_t size);
    void addSlab(SlabCache* cache);
    size_t getObjectSize(void* ptr);
};

SlabAllocator* SlabAllocator::Instance() {
    static SlabAllocator instance;
    return &instance;
}

SlabAllocator::SlabAllocator() {
    // 초기화: 적절한 크기의 캐시를 미리 준비해 둡니다.
    slabCaches.resize(1024, NULL); // 예시로 최대 1024바이트까지 관리
}

SlabAllocator::~SlabAllocator() {
    for (size_t i = 0; i < slabCaches.size(); ++i) {
        if (slabCaches[i]) {
            for (size_t j = 0; j < slabCaches[i]->slabs.size(); ++j) {
                ::free(slabCaches[i]->slabs[j]);
            }
            delete slabCaches[i];
        }
    }
}

SlabAllocator::SlabCache* SlabAllocator::getCache(size_t size) {
    if (size >= slabCaches.size()) {
        return NULL;
    }

    if (!slabCaches[size]) {
        SlabCache* cache = new SlabCache();
        cache->objectSize = size;
        cache->freeList = NULL;
        slabCaches[size] = cache;
    }

    return slabCaches[size];
}

void SlabAllocator::addSlab(SlabCache* cache) {
    // 객체 크기 + 크기 정보용 메타데이터를 고려하여 슬랩 할당
    void* newSlab = ::malloc((cache->objectSize + sizeof(size_t)) * 8);
    cache->slabs.push_back(newSlab);

    char* slabPtr = static_cast<char*>(newSlab);

    for (int i = 0; i < 8; ++i) {
        *reinterpret_cast<size_t*>(slabPtr) = cache->objectSize;
        Slab* slab = reinterpret_cast<Slab*>(slabPtr + sizeof(size_t));
        slab->next = cache->freeList;
        cache->freeList = slab;
        slabPtr += (cache->objectSize + sizeof(size_t));
    }
}

void* SlabAllocator::allocate(size_t size) {
    SlabCache* cache = getCache(size);

    // 해당 크기의 캐시가 없으면 생성
    if (!cache) {
        return ::malloc(size); // 해당 사이즈에 대한 슬랩 캐시가 없는 경우, 기본 할당
    }

    if (!cache->freeList) {
        addSlab(cache);
    }

    Slab* slab = cache->freeList;
    cache->freeList = slab->next;

    return reinterpret_cast<void*>(reinterpret_cast<char*>(slab) - sizeof(size_t));
}

void SlabAllocator::free(void* ptr) {
    // 저장된 크기 정보를 이용해 슬랩 캐시를 찾음
    size_t size = getObjectSize(ptr);
    SlabCache* cache = getCache(size);

    if (!cache) {
        ::free(ptr); // 해당 사이즈에 대한 슬랩 캐시가 없으면 기본 해제
        return;
    }

    // 메모리를 해제하고 자유 리스트로 반환
    char* actualPtr = reinterpret_cast<char*>(ptr) + sizeof(size_t);
    Slab* slab = reinterpret_cast<Slab*>(actualPtr);
    slab->next = cache->freeList;
    cache->freeList = slab;
}

size_t SlabAllocator::getObjectSize(void* ptr) {
    return *reinterpret_cast<size_t*>(ptr);
}
