#include <stdlib.h>
#include <stddef.h>

class SlabAllocator {
private:
    struct Slab {
        Slab* next;
        void* free_list;
        size_t block_size;
        size_t free_count;
    };

    struct SlabCache {
        Slab* slabs;
        size_t block_size;
        size_t slab_size;
    };

    SlabCache cache;

    // Private constructor for singleton pattern
    SlabAllocator() {
        cache.slabs = nullptr;
        cache.block_size = 0;
        cache.slab_size = 0;
    }

    // Destructor
    ~SlabAllocator() {
        Slab* slab = cache.slabs;
        while (slab) {
            Slab* next = slab->next;
            free(slab->free_list);
            free(slab);
            slab = next;
        }
    }

    // Create a new slab
    Slab* createSlab(size_t block_size, size_t slab_size) {
        Slab* slab = (Slab*)malloc(sizeof(Slab));
        slab->block_size = block_size;
        slab->free_count = slab_size / block_size;
        slab->free_list = malloc(slab_size);
        slab->next = nullptr;

        // Initialize the free list
        void* ptr = slab->free_list;
        for (size_t i = 0; i < slab->free_count; i++) {
            *((void**)ptr) = (char*)ptr + block_size;
            ptr = (char*)ptr + block_size;
        }

        return slab;
    }

public:
    // Allocate memory
    void* allocate(size_t size) {
        Slab* slab = cache.slabs;

        // Find a slab with available space
        while (slab && slab->free_count == 0) {
            slab = slab->next;
        }

        // If no slab has available space, create a new one
        if (!slab) {
            slab = createSlab(size, size * 8);  // Example slab size, adjust as needed
            slab->next = cache.slabs;
            cache.slabs = slab;
        }

        // Allocate memory from the slab
        void* block = slab->free_list;
        slab->free_list = *((void**)slab->free_list);
        slab->free_count--;

        return block;
    }

    // Free allocated memory
    void free(void* ptr, size_t size) {
        Slab* slab = cache.slabs;

        // Find the slab containing this pointer
        while (slab && !((ptr >= slab->free_list) && (ptr < (char*)slab->free_list + cache.slab_size))) {
            slab = slab->next;
        }

        if (slab) {
            // Free the memory block
            *((void**)ptr) = slab->free_list;
            slab->free_list = ptr;
            slab->free_count++;
        }
    }

    // Get the singleton instance
    static SlabAllocator* Instance() {
        static SlabAllocator instance;
        return &instance;
    }
};
