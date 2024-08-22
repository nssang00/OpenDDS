#include <iostream>
#include <vector>
#include <map>
#include <algorithm> // For std::fill

class SlabAllocator {
public:
    SlabAllocator();
    ~SlabAllocator();

    void* allocate(size_t size);
    void free(void* ptr, size_t size);

    static SlabAllocator* Instance();
private:
    struct Slab;
    struct Cache {
        size_t objectSize;
        std::vector<Slab*> slabs;

        Cache(size_t size) : objectSize(size) {}
        ~Cache();
    };

    struct Slab {
        unsigned char* data;
        size_t objectSize;
        size_t capacity;
        size_t freeCount;
        bool* freeMap;

        Slab(size_t objSize, size_t capacity);
        ~Slab();
        void* allocate();
        void deallocate(void* ptr);
    };

    std::map<size_t, Cache*> caches;

    Cache* getCache(size_t size);
    Slab* createSlab(size_t size);
};

SlabAllocator::SlabAllocator() {}

SlabAllocator::~SlabAllocator() {
    for (std::map<size_t, Cache*>::iterator it = caches.begin(); it != caches.end(); ++it) {
        delete it->second;
    }
}

SlabAllocator* SlabAllocator::Instance() {
    static SlabAllocator instance;
    return &instance;
}

void* SlabAllocator::allocate(size_t size) {
    Cache* cache = getCache(size);
    for (size_t i = 0; i < cache->slabs.size(); ++i) {
        if (cache->slabs[i]->freeCount > 0) {
            return cache->slabs[i]->allocate();
        }
    }

    Slab* newSlab = createSlab(size);
    cache->slabs.push_back(newSlab);
    return newSlab->allocate();
}

void SlabAllocator::free(void* ptr, size_t size) {
    Cache* cache = getCache(size);
    for (size_t i = 0; i < cache->slabs.size(); ++i) {
        Slab* slab = cache->slabs[i];
        if (slab->data <= (unsigned char*)ptr && (unsigned char*)ptr < slab->data + slab->objectSize * slab->capacity) {
            slab->deallocate(ptr);
            break;
        }
    }
}

SlabAllocator::Cache* SlabAllocator::getCache(size_t size) {
    std::map<size_t, Cache*>::iterator it = caches.find(size);
    if (it != caches.end()) {
        return it->second;
    }

    Cache* newCache = new Cache(size);
    caches[size] = newCache;
    return newCache;
}

SlabAllocator::Slab* SlabAllocator::createSlab(size_t size) {
    size_t capacity = 1024; // 1024 objects per slab
    return new Slab(size, capacity);
}

SlabAllocator::Cache::~Cache() {
    for (size_t i = 0; i < slabs.size(); ++i) {
        delete slabs[i];
    }
}

SlabAllocator::Slab::Slab(size_t objSize, size_t cap) 
    : objectSize(objSize), capacity(cap), freeCount(cap) {
    data = new unsigned char[objSize * cap];
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
            return data + i * objectSize;
        }
    }
    return 0;
}

void SlabAllocator::Slab::deallocate(void* ptr) {
    size_t index = ((unsigned char*)ptr - data) / objectSize;
    if (!freeMap[index]) {
        freeMap[index] = true;
        ++freeCount;
    }
}
