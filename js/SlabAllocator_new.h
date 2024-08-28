#include <cstddef>
#include <vector>
#include <map>
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

    std::map<size_t, SlabCache*> slabCaches;

    void addSlab(size_t size);
    size_t getObjectSize(void* ptr);
};

SlabAllocator* SlabAllocator::Instance() {
    static SlabAllocator instance;
    return &instance;
}

SlabAllocator::SlabAllocator() {}

SlabAllocator::~SlabAllocator() {
    std::map<size_t, SlabCache*>::iterator it;
    for (it = slabCaches.begin(); it != slabCaches.end(); ++it) {
        SlabCache* cache = it->second;
        for (size_t i = 0; i < cache->slabs.size(); ++i) {
            ::free(cache->slabs[i]);
        }
        delete cache;
    }
}

void SlabAllocator::addSlab(size_t size) {
    SlabCache* cache;
    
    // 기존 캐시가 없으면 새로 생성
    if (slabCaches.find(size) == slabCaches.end()) {
        cache = new SlabCache();
        cache->objectSize = size;
        cache->freeList = NULL;
        slabCaches[size] = cache;
    } else {
        cache = slabCaches[size];
    }

    // 메모리 할당 (객체 크기 + 크기 정보용 메타데이터)
    void* newSlab = ::malloc((size + sizeof(size_t)) * 8);
    cache->slabs.push_back(newSlab);

    char* slabPtr = static_cast<char*>(newSlab);

    for (int i = 0; i < 8; ++i) {
        // 객체 크기 기록
        *reinterpret_cast<size_t*>(slabPtr) = size;
        Slab* slab = reinterpret_cast<Slab*>(slabPtr + sizeof(size_t));
        slab->next = cache->freeList;
        cache->freeList = slab;
        slabPtr += (size + sizeof(size_t));
    }
}

void* SlabAllocator::allocate(size_t size) {
    SlabCache* cache;

    // 해당 크기의 캐시가 없다면 생성
    if (slabCaches.find(size) == slabCaches.end()) {
        addSlab(size);
    }

    cache = slabCaches[size];
    if (!cache->freeList) {
        addSlab(size);
    }

    Slab* slab = cache->freeList;
    cache->freeList = slab->next;

    return reinterpret_cast<void*>(reinterpret_cast<char*>(slab) + sizeof(size_t));
}

void SlabAllocator::free(void* ptr) {
    // 저장된 크기 정보를 이용해 슬랩 캐시를 찾음
    size_t size = getObjectSize(ptr);
    SlabCache* cache = slabCaches[size];

    // 메모리를 해제하고 자유 리스트로 반환
    char* actualPtr = reinterpret_cast<char*>(ptr) - sizeof(size_t);
    Slab* slab = reinterpret_cast<Slab*>(actualPtr);
    slab->next = cache->freeList;
    cache->freeList = slab;
}

size_t SlabAllocator::getObjectSize(void* ptr) {
    // ptr이 실제로는 슬랩 내부의 시작 부분보다 sizeof(size_t)만큼 뒤에 위치함
    char* actualPtr = reinterpret_cast<char*>(ptr) - sizeof(size_t);
    return *reinterpret_cast<size_t*>(actualPtr);
}
