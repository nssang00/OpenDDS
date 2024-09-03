#include <cmath>  // For basic math functions

// Calculate the number of free block entries based on MIN_BLOCK_SIZE and MAX_BLOCK_SIZE
int calculateFreeBlockEntrySize(int minBlockSize, int maxBlockSize) {
    int size = maxBlockSize;
    int count = 0;
    while (size > minBlockSize) {
        size >>= 1;  // Divide size by 2 (equivalent to shifting right by 1)
        count++;
    }
    return count + 1;  // +1 to include the entry for MIN_BLOCK_SIZE
}

static const int MIN_BLOCK_SIZE = 8;  // Minimum block size
static const int MAX_BLOCK_SIZE = 4096;  // Maximum block size

// Automatically calculate the number of entries
static const int FREE_BLOCK_ENTRY_SIZE = calculateFreeBlockEntrySize(MIN_BLOCK_SIZE, MAX_BLOCK_SIZE);

class CustomAllocator {
public:
    CustomAllocator();
    ~CustomAllocator();
    void* allocate(size_t size);
    void free(void* object, size_t size);

    static CustomAllocator* Instance(int num = 0);

private:
    static const unsigned int HEADER_SIGNATURE = 0x435348ABU;
    static const unsigned int FOOTER_SIGNATURE = 0xEF474D4BU;

    static const int MEM_POOL_SIZE = 32 * 1024;  // Memory pool size (32KB)

    static const int MIN_BLOCK_SIZE = 8;  // Minimum block size
    static const int MAX_BLOCK_SIZE = 4096;  // Maximum block size

    // Automatically calculated based on MIN_BLOCK_SIZE and MAX_BLOCK_SIZE
    static const int FREE_BLOCK_ENTRY_SIZE = calculateFreeBlockEntrySize(MIN_BLOCK_SIZE, MAX_BLOCK_SIZE);

    static const int MEM_MANAGER_SIZE = 2;
    static const int MAX_BLOCKS_PER_ENTRY = 1024;
    static const int MIN_BLOCKS_PER_ENTRY = 1;
    static const int HIT_COUNT_THRESHOLD = 10;

#define ALIGN(size, alignment) (((size) + (alignment - 1)) & ~(alignment - 1))
#define BLOCK_HEADER_SIZE ALIGN(sizeof(MemBlock) - sizeof(unsigned char*), MIN_BLOCK_SIZE)
#define BLOCK_FOOTER_SIZE sizeof(unsigned int)

    struct MemBlock {
        unsigned int signature;
        unsigned int size;
        struct MemBlock* next;
        unsigned char* payload;
    };

    struct MemChunk {
        unsigned char* payload;
    };

    struct FreeBlockEntry {
        size_t size;
        struct MemBlock* head;
        size_t hitCount;
        size_t numBlocks;
    };

    static CustomAllocator* instance[MEM_MANAGER_SIZE];

    std::vector<MemChunk*> memChunkList;
    FreeBlockEntry freeBlockEntryList[FREE_BLOCK_ENTRY_SIZE];
    Mutex* mutex;

    MemBlock* allocateMemBlocks(size_t size, size_t numBlocks);
    int findFreeListIndex(size_t size);
};
