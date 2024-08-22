#include <vector>
#include <cstddef>
#include <algorithm>
#include <windows.h>

class SlabAllocator {
private:
    struct Slab {
        void* memory;
        std::vector<bool> used;
        size_t free_count;
    };

    struct SlabCache {
        std::vector<Slab> slabs;
        size_t object_size;
        size_t objects_per_slab;
        CRITICAL_SECTION cs;
    };

    static const size_t SLAB_SIZE = 64 * 1024;  // 64KB
    static const size_t MAX_SMALL_OBJECT_SIZE = 256;
    static const size_t NUM_SMALL_OBJECT_CACHES = MAX_SMALL_OBJECT_SIZE / 8;

    std::vector<SlabCache> small_object_caches;
    SlabCache large_object_cache;

    SlabCache& getCache(size_t size) {
        if (size <= MAX_SMALL_OBJECT_SIZE) {
            size_t index = (size - 1) / 8;
            return small_object_caches[index];
        }
        return large_object_cache;
    }

    void* allocateFromSlab(SlabCache& cache) {
        EnterCriticalSection(&cache.cs);
        for (size_t i = 0; i < cache.slabs.size(); ++i) {
            Slab& slab = cache.slabs[i];
            if (slab.free_count > 0) {
                std::vector<bool>::iterator it = std::find(slab.used.begin(), slab.used.end(), false);
                size_t index = std::distance(slab.used.begin(), it);
                slab.used[index] = true;
                slab.free_count--;
                LeaveCriticalSection(&cache.cs);
                return static_cast<char*>(slab.memory) + index * cache.object_size;
            }
        }

        // No free objects, create a new slab
        Slab new_slab;
        new_slab.memory = operator new(SLAB_SIZE);
        new_slab.used.resize(cache.objects_per_slab, false);
        new_slab.free_count = cache.objects_per_slab;
        cache.slabs.push_back(new_slab);

        new_slab.used[0] = true;
        new_slab.free_count--;
        void* result = new_slab.memory;
        LeaveCriticalSection(&cache.cs);
        return result;
    }

public:
    SlabAllocator() : small_object_caches(NUM_SMALL_OBJECT_CACHES) {
        for (size_t i = 0; i < NUM_SMALL_OBJECT_CACHES; ++i) {
            small_object_caches[i].object_size = (i + 1) * 8;
            small_object_caches[i].objects_per_slab = SLAB_SIZE / small_object_caches[i].object_size;
            InitializeCriticalSection(&small_object_caches[i].cs);
        }
        large_object_cache.object_size = 0;  // Variable size for large objects
        large_object_cache.objects_per_slab = 1;
        InitializeCriticalSection(&large_object_cache.cs);
    }

    void* allocate(size_t size) {
        if (size == 0) return NULL;

        SlabCache& cache = getCache(size);
        if (&cache == &large_object_cache) {
            // For large objects, allocate directly
            return operator new(size);
        }

        return allocateFromSlab(cache);
    }

    void deallocate(void* ptr, size_t size) {
        if (ptr == NULL) return;

        SlabCache& cache = getCache(size);
        if (&cache == &large_object_cache) {
            // For large objects, deallocate directly
            operator delete(ptr);
            return;
        }

        EnterCriticalSection(&cache.cs);
        for (size_t i = 0; i < cache.slabs.size(); ++i) {
            Slab& slab = cache.slabs[i];
            if (ptr >= slab.memory && ptr < static_cast<char*>(slab.memory) + SLAB_SIZE) {
                size_t index = (static_cast<char*>(ptr) - static_cast<char*>(slab.memory)) / cache.object_size;
                slab.used[index] = false;
                slab.free_count++;
                LeaveCriticalSection(&cache.cs);
                return;
            }
        }
        LeaveCriticalSection(&cache.cs);
    }

    ~SlabAllocator() {
        for (size_t i = 0; i < small_object_caches.size(); ++i) {
            for (size_t j = 0; j < small_object_caches[i].slabs.size(); ++j) {
                operator delete(small_object_caches[i].slabs[j].memory);
            }
            DeleteCriticalSection(&small_object_caches[i].cs);
        }
        DeleteCriticalSection(&large_object_cache.cs);
    }
};
