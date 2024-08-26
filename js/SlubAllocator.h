#include <iostream>
#include <vector>
#include <map>
#include <algorithm> // For std::fill
#include <windows.h> // Windows API 헤더 추가

class SlubAllocator {
public:
    SlubAllocator();
    ~SlubAllocator();

    void* allocate(size_t size);
    void deallocate(void* ptr, size_t size);

    static SlubAllocator* Instance();

private:
    struct Slab;
    struct Cache {
        size_t objectSize;
        std::vector<Slab*> slabs;
        size_t slabSize;

        Cache(size_t size);
        ~Cache();
        void* allocate();
        void deallocate(void* ptr);
    };

    struct Slab {
        unsigned char* data;
        size_t objectSize;
        size_t capacity;
        size_t freeCount;
        bool* freeMap;

        Slab(size_t objSize, size_t cap);
        ~Slab();
        void* allocate();
        void deallocate(void* ptr);
    };

    std::map<size_t, Cache*> caches;
    CRITICAL_SECTION cs; // 크리티컬 섹션 추가

    Cache* getCache(size_t size);
    Slab* createSlab(size_t size);
};

SlubAllocator::SlubAllocator() {
    InitializeCriticalSection(&cs); // 크리티컬 섹션 초기화
}

SlubAllocator::~SlubAllocator() {
    for (std::map<size_t, Cache*>::iterator it = caches.begin(); it != caches.end(); ++it) {
        delete it->second;
    }
    DeleteCriticalSection(&cs); // 크리티컬 섹션 삭제
}

SlubAllocator* SlubAllocator::Instance() {
    static SlubAllocator instance;
    return &instance;
}

void* SlubAllocator::allocate(size_t size) {
    EnterCriticalSection(&cs); // 크리티컬 섹션 진입
    Cache* cache = getCache(size);
    void* result = cache->allocate();
    LeaveCriticalSection(&cs); // 크리티컬 섹션 종료
    return result;
}

void SlubAllocator::deallocate(void* ptr, size_t size) {
    EnterCriticalSection(&cs); // 크리티컬 섹션 진입
    Cache* cache = getCache(size);
    cache->deallocate(ptr);
    LeaveCriticalSection(&cs); // 크리티컬 섹션 종료
}

SlubAllocator::Cache* SlubAllocator::getCache(size_t size) {
    std::map<size_t, Cache*>::iterator it = caches.find(size);
    if (it != caches.end()) {
        return it->second;
    }

    Cache* newCache = new Cache(size);
    caches[size] = newCache;
    return newCache;
}

SlubAllocator::Slab* SlubAllocator::createSlab(size_t size) {
    size_t capacity = 1024; // 1024 objects per slab
    return new Slab(size, capacity);
}

SlubAllocator::Cache::Cache(size_t size) : objectSize(size), slabSize(1024) {
    // Create an initial slab
    slabs.push_back(SlubAllocator::createSlab(size));
}

SlubAllocator::Cache::~Cache() {
    for (Slab* slab : slabs) {
        delete slab;
    }
}

void* SlubAllocator::Cache::allocate() {
    for (Slab* slab : slabs) {
        void* result = slab->allocate();
        if (result) {
            return result;
        }
    }

    // All slabs are full, create a new slab
    Slab* newSlab = SlubAllocator::createSlab(objectSize);
    slabs.push_back(newSlab);
    return newSlab->allocate();
}

void SlubAllocator::Cache::deallocate(void* ptr) {
    for (Slab* slab : slabs) {
        if (slab->data <= static_cast<unsigned char*>(ptr) &&
            static_cast<unsigned char*>(ptr) < slab->data + slab->objectSize * slab->capacity) {
            slab->deallocate(ptr);
            return;
        }
    }
}

SlubAllocator::Slab::Slab(size_t objSize, size_t cap)
    : objectSize(objSize), capacity(cap), freeCount(cap) {
    data = new unsigned char[objSize * cap];
    freeMap = new bool[cap];
    std::fill(freeMap, freeMap + cap, true);
}

SlubAllocator::Slab::~Slab() {
    delete[] data;
    delete[] freeMap;
}

void* SlubAllocator::Slab::allocate() {
    for (size_t i = 0; i < capacity; ++i) {
        if (freeMap[i]) {
            freeMap[i] = false;
            --freeCount;
            return data + i * objectSize;
        }
    }
    return nullptr;
}

void SlubAllocator::Slab::deallocate(void* ptr) {
    size_t index = (static_cast<unsigned char*>(ptr) - data) / objectSize;
    if (!freeMap[index]) {
        freeMap[index] = true;
        ++freeCount;
    }
}
