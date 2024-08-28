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
    for (std::map<size_t, SlabCache*>::iterator it = slabCaches.begin(); it != slabCaches.end(); ++it) {
        SlabCache* cache = it->second;
        for (std::vector<void*>::iterator vecIt = cache->slabs.begin(); vecIt != cache->slabs.end(); ++vecIt) {
            ::free(*vecIt);
        }
        delete cache;
    }
}

void SlabAllocator::addSlab(size_t size) {
    SlabCache* cache;

    // Get or create cache
    std::map<size_t, SlabCache*>::iterator it = slabCaches.find(size);
    if (it == slabCaches.end()) {
        cache = new SlabCache();
        cache->objectSize = size;
        cache->freeList = NULL;
        slabCaches[size] = cache;
    } else {
        cache = it->second;
    }

    // Allocate a new slab
    size_t slabSize = (size + sizeof(size_t)) * 8;
    void* newSlab = ::malloc(slabSize);
    cache->slabs.push_back(newSlab);

    char* slabPtr = static_cast<char*>(newSlab);

    for (int i = 0; i < 8; ++i) {
        // Store object size at the start of the block
        *reinterpret_cast<size_t*>(slabPtr) = size;
        Slab* slab = reinterpret_cast<Slab*>(slabPtr + sizeof(size_t));
        slab->next = cache->freeList;
        cache->freeList = slab;
        slabPtr += (size + sizeof(size_t)); // Move to next block
    }
}

void* SlabAllocator::allocate(size_t size) {
    SlabCache* cache;

    // Get or create cache
    std::map<size_t, SlabCache*>::iterator it = slabCaches.find(size);
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

    // Return pointer to the allocated object
    return reinterpret_cast<void*>(reinterpret_cast<char*>(slab) + sizeof(size_t));
}

void SlabAllocator::free(void* ptr) {
    // Get object size to find the correct cache
    size_t size = getObjectSize(ptr);
    SlabCache* cache = slabCaches[size];

    // Adjust pointer to find the start of the slab
    char* actualPtr = reinterpret_cast<char*>(ptr) - sizeof(size_t);
    Slab* slab = reinterpret_cast<Slab*>(actualPtr);
    slab->next = cache->freeList;
    cache->freeList = slab;
}

size_t SlabAllocator::getObjectSize(void* ptr) {
    // Adjust pointer to the start of the slab
    char* actualPtr = reinterpret_cast<char*>(ptr) - sizeof(size_t);
    return *reinterpret_cast<size_t*>(actualPtr);
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
