#include <cstddef>
#include <cstdint>
#include <cstring>
#include <algorithm>
#include <new>

class TLSFMemoryManager {
private:
    static constexpr size_t BLOCK_SIZES = 32;
    static constexpr size_t MAX_POOL_SIZE = 1024 * 1024; // 1MB

    struct Block {
        size_t size;
        Block* next;
    };

    Block* free_lists[BLOCK_SIZES];
    char* memory_pool;
    size_t pool_size;

    size_t find_index(size_t size) {
        return std::min(static_cast<size_t>(31), static_cast<size_t>(__builtin_clz(size) ^ 31));
    }

    Block* split_block(Block* block, size_t size) {
        if (block->size > size + sizeof(Block)) {
            Block* new_block = reinterpret_cast<Block*>(reinterpret_cast<char*>(block) + size);
            new_block->size = block->size - size;
            new_block->next = nullptr;
            block->size = size;
            return new_block;
        }
        return nullptr;
    }

public:
    TLSFMemoryManager(size_t size = MAX_POOL_SIZE) : pool_size(size) {
        memory_pool = new char[pool_size];
        std::memset(free_lists, 0, sizeof(free_lists));

        Block* initial_block = reinterpret_cast<Block*>(memory_pool);
        initial_block->size = pool_size;
        initial_block->next = nullptr;

        size_t index = find_index(pool_size);
        free_lists[index] = initial_block;
    }

    ~TLSFMemoryManager() {
        delete[] memory_pool;
    }

    void* allocate(size_t size) {
        size = std::max(size + sizeof(Block), sizeof(Block) * 2);
        size_t index = find_index(size);

        for (size_t i = index; i < BLOCK_SIZES; ++i) {
            if (free_lists[i]) {
                Block* block = free_lists[i];
                free_lists[i] = block->next;

                Block* remaining = split_block(block, size);
                if (remaining) {
                    size_t new_index = find_index(remaining->size);
                    remaining->next = free_lists[new_index];
                    free_lists[new_index] = remaining;
                }

                return reinterpret_cast<void*>(reinterpret_cast<char*>(block) + sizeof(Block));
            }
        }

        return nullptr; // Out of memory
    }

    void deallocate(void* ptr) {
        if (!ptr) return;

        Block* block = reinterpret_cast<Block*>(reinterpret_cast<char*>(ptr) - sizeof(Block));
        size_t index = find_index(block->size);

        block->next = free_lists[index];
        free_lists[index] = block;

        // TODO: Implement coalescing of adjacent free blocks
    }
};

// Usage example
int main() {
    TLSFMemoryManager mm;

    int* a = static_cast<int*>(mm.allocate(sizeof(int)));
    *a = 5;
    
    char* str = static_cast<char*>(mm.allocate(10));
    strcpy(str, "Hello");

    mm.deallocate(a);
    mm.deallocate(str);

    return 0;
}
