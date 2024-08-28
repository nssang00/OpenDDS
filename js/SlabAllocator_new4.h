#include <iostream>
#include <vector>
#include <cstdlib>
#include <cassert>

class SlabAllocator3 {
public:
    static SlabAllocator3* Instance() {
        static SlabAllocator3 instance;
        return &instance;
    }

    void* allocate(size_t size) {
        size = getAdjustedSize(size);
        size_t index = getSizeIndex(size);

        if (slabCaches[index] == NULL) {
            slabCaches[index] = new SlabCache(size);
            addSlab(size);
        }

        SlabCache* cache = slabCaches[index];
        if (cache->freeList == NULL) {
            addSlab(size);
        }

        Slab* slab = cache->freeList;
        cache->freeList = slab->next;

        return static_cast<void*>(static_cast<char*>(static_cast<void*>(slab)) + sizeof(Slab));
    }

    void free(void* ptr) {
        Slab* slab = reinterpret_cast<Slab*>(static_cast<char*>(ptr) - sizeof(Slab));
        size_t index = getSizeIndex(slab->cache->objectSize);

        slab->next = slabCaches[index]->freeList;
        slabCaches[index]->freeList = slab;
    }

private:
    struct SlabCache;  // 전방 선언

    struct Slab {
        Slab* next;
        SlabCache* cache;
    };

    struct SlabCache {
        size_t objectSize;
        Slab* freeList;
        std::vector<void*> slabs;

        SlabCache(size_t size) : objectSize(size), freeList(NULL) {}
    };

    std::vector<SlabCache*> slabCaches;

    SlabAllocator3() : slabCaches(32, static_cast<SlabCache*>(NULL)) {}  // 초기화 수정

    ~SlabAllocator3() {
        for (size_t i = 0; i < slabCaches.size(); ++i) {
            if (slabCaches[i]) {
                for (size_t j = 0; j < slabCaches[i]->slabs.size(); ++j) {
                    std::free(slabCaches[i]->slabs[j]);
                }
                delete slabCaches[i];
            }
        }
    }

    void addSlab(size_t size) {
        size_t slabSize = sizeof(Slab) > size ? sizeof(Slab) : size;
        void* memory = std::malloc(slabSize * 8);

        size_t index = getSizeIndex(size);
        SlabCache* cache = slabCaches[index];
        cache->slabs.push_back(memory);

        char* current = static_cast<char*>(memory);
        for (size_t i = 0; i < 8; ++i) {
            Slab* slab = reinterpret_cast<Slab*>(current);
            slab->cache = cache;
            slab->next = cache->freeList;
            cache->freeList = slab;
            current += slabSize;
        }
    }

    size_t getAdjustedSize(size_t size) {
        if (size <= 8) return 8;

        size_t adjustedSize = 1;
        while (adjustedSize < size) {
            adjustedSize <<= 1;
        }

        return adjustedSize;
    }

    size_t getSizeIndex(size_t size) {
        size_t index = 0;
        while (size > 8) {
            size >>= 1;
            ++index;
        }
        return index;
    }
};

