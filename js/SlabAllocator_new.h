#include <cstddef>
#include <vector>
#include <map>
#include <cstdlib>
#include <cassert>
#include <iostream>

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

// Singleton instance
SlabAllocator* SlabAllocator::Instance() {
    static SlabAllocator instance;
    return &instance;
}

SlabAllocator::SlabAllocator() {}

SlabAllocator::~SlabAllocator() {
    for (auto& pair : slabCaches) {
        SlabCache* cache = pair.second;
        for (void* slab : cache->slabs) {
            ::free(slab);
        }
        delete cache;
    }
}

void SlabAllocator::addSlab(size_t size) {
    SlabCache* cache;

    auto it = slabCaches.find(size);
    if (it == slabCaches.end()) {
        cache = new SlabCache();
        cache->objectSize = size;
        cache->freeList = nullptr;
        slabCaches[size] = cache;
    } else {
        cache = it->second;
    }

    size_t slabSize = (size + sizeof(Slab)) * 8;
    void* newSlab = ::malloc(slabSize);
    cache->slabs.push_back(newSlab);

    char* slabPtr = static_cast<char*>(newSlab);
    for (int i = 0; i < 8; ++i) {
        Slab* slab = reinterpret_cast<Slab*>(slabPtr);
        slab->next = cache->freeList;
        cache->freeList = slab;
        slabPtr += size + sizeof(Slab);
    }
}

void* SlabAllocator::allocate(size_t size) {
    SlabCache* cache;

    auto it = slabCaches.find(size);
    if (it == slabCaches.end()) {
        addSlab(size);
        it = slabCaches.find(size);
    }

    cache = it->second;
    if (!cache->freeList) {
        addSlab(size);
    }

    Slab* slab = cache->freeList;
    cache->freeList = slab->next;

    return reinterpret_cast<void*>(reinterpret_cast<char*>(slab) + sizeof(Slab));
}

void SlabAllocator::free(void* ptr) {
    size_t size = getObjectSize(ptr);
    SlabCache* cache = slabCaches[size];

    char* actualPtr = reinterpret_cast<char*>(ptr) - sizeof(Slab);
    Slab* slab = reinterpret_cast<Slab*>(actualPtr);
    slab->next = cache->freeList;
    cache->freeList = slab;
}


size_t SlabAllocator::getObjectSize(void* ptr) {
    char* actualPtr = reinterpret_cast<char*>(ptr) - sizeof(Slab);
    return *(reinterpret_cast<size_t*>(actualPtr + sizeof(Slab) - sizeof(size_t)));
}

// Example usage
int main() {
    SlabAllocator* allocator = SlabAllocator::Instance();

    // Allocate a block of 64 bytes
    void* ptr1 = allocator->allocate(64);
    std::cout << "Allocated block at: " << ptr1 << std::endl;

    // Free the allocated block
    allocator->free(ptr1);
    std::cout << "Freed block at: " << ptr1 << std::endl;

    return 0;
}
