#include <vector>


class CustomAllocator {
public:
    CustomAllocator();
    ~CustomAllocator();
    void* allocate(size_t size);
    void free(void* object, size_t size);

    static CustomAllocator* Instance(int num = 0);

private:
    static const unsigned int HEADER_SIGNATURE = 0x435348ABU;  // Signature value of the block header
    static const unsigned int FOOTER_SIGNATURE = 0xEF474D4BU;  // Signature value of the block footer

    static const int MEM_POOL_SIZE = 32 * 1024;  // Memory pool size (32KB)
    static const int FREE_BLOCK_ENTRY_SIZE = 24; // Number of free block entries

    static const int MIN_BLOCK_SIZE = 8;  // Minimum block size
    static const int MAX_BLOCK_SIZE = 4096;  // Maximum block size
    static const int MEM_MANAGER_SIZE = 2;  // Size of memory manager array
    static const int MAX_BLOCKS_PER_ENTRY = 1024;  // Maximum number of blocks per entry
    static const int MIN_BLOCKS_PER_ENTRY = 1;  // Minimum number of blocks per entry
    static const int HIT_COUNT_THRESHOLD = 10;  // Hit count threshold for block expansion

#define ALIGN(size, alignment) (((size) + (alignment - 1)) & ~(alignment - 1))  // Memory alignment macro
#define BLOCK_HEADER_SIZE ALIGN(sizeof(MemBlock) - sizeof(unsigned char*), MIN_BLOCK_SIZE)  // Block header size
#define BLOCK_FOOTER_SIZE sizeof(unsigned int)  // Block footer size

    // Memory block structure
    struct MemBlock {
        unsigned int signature;  // Block header signature
        unsigned int size;  // Block size
        struct MemBlock* next;  // Pointer to the next block
        unsigned char* payload;  // Block payload
    };

    // Memory chunk structure
    struct MemChunk {
        unsigned char* payload;  // Payload of the memory chunk
    };

    // Free block entry structure
    struct FreeBlockEntry {
        size_t size;  // Block size
        struct MemBlock* head;  // Head of the free block list
        size_t hitCount;  // Block usage hit count
        size_t numBlocks;  // Current number of blocks
    };

    static CustomAllocator* instance[MEM_MANAGER_SIZE];  // Singleton instance array

    std::vector<MemChunk*> memChunkList;  // List of memory chunks
    FreeBlockEntry freeBlockEntryList[FREE_BLOCK_ENTRY_SIZE];  // List of free block entries
    Mutex* mutex;  // Mutex object

    MemBlock* allocateMemBlocks(size_t size, size_t numBlocks);  // Function to allocate memory blocks

    // Function to find the index of the free block list that matches the given size
    int findFreeListIndex(size_t size);
};

CustomAllocator* CustomAllocator::instance[MEM_MANAGER_SIZE] = { NULL, NULL };

CustomAllocator::CustomAllocator() {
    // Initialize free block entries
    for (int i = 0; i < FREE_BLOCK_ENTRY_SIZE; i++) {
        freeBlockEntryList[i].size = MIN_BLOCK_SIZE << i;  // Set the size of each block entry
        freeBlockEntryList[i].head = NULL;  // Initialize the head of the block list to NULL
        freeBlockEntryList[i].hitCount = 0;  // Initialize hit count
        freeBlockEntryList[i].numBlocks = max(MEM_POOL_SIZE / (freeBlockEntryList[i].size + BLOCK_HEADER_SIZE + BLOCK_FOOTER_SIZE), (size_t)MIN_BLOCKS_PER_ENTRY);  // Set the number of blocks
    }
    mutex = new Mutex;  // Create Mutex object
}

CustomAllocator::~CustomAllocator() {
    // Iterate through the memory chunk list and free memory
    for (std::vector<MemChunk*>::iterator it = memChunkList.begin(); it != memChunkList.end(); ++it) {
        MemChunk* memChunk = *it;
        delete[] memChunk->payload;  // Delete the payload of the memory chunk
        delete memChunk;  // Delete the memory chunk object
    }
    memChunkList.clear();  // Clear the memory chunk list
    delete mutex;  // Delete the Mutex object
}

CustomAllocator* CustomAllocator::Instance(int num) {
    if (!instance[num])
        instance[num] = new CustomAllocator();  // Create a new instance if one does not exist
    return instance[num];  // Return the instance
}

// Memory allocation function
void* CustomAllocator::allocate(size_t size) {
    int index = findFreeListIndex(size);  // Find the index that matches the requested size
    size_t newSize = freeBlockEntryList[index].size;  // Get the size of the block to be allocated

    mutex->lock();  // Lock the Mutex

    MemBlock* memBlock = freeBlockEntryList[index].head;

    if (!memBlock) { // If there are no free blocks, allocate a new memory block
        freeBlockEntryList[index].hitCount++;

        // If the block usage exceeds the threshold and the number of blocks is less than the maximum, expand the number of blocks
        if (freeBlockEntryList[index].hitCount >= HIT_COUNT_THRESHOLD && 
            freeBlockEntryList[index].numBlocks < MAX_BLOCKS_PER_ENTRY) {
            freeBlockEntryList[index].numBlocks = min(freeBlockEntryList[index].numBlocks * 2, MAX_BLOCKS_PER_ENTRY);
            freeBlockEntryList[index].hitCount = 0;
        }
        memBlock = allocateMemBlocks(newSize, freeBlockEntryList[index].numBlocks);  // Allocate a new memory block
    }

    if (memBlock) {
        freeBlockEntryList[index].head = memBlock->next;  // Remove the block from the free block list
    }

    mutex->unlock();  // Unlock the Mutex

    return memBlock ? (void*)&(memBlock->payload) : NULL;  // Return the payload of the memory block
}

// Memory free function
void CustomAllocator::free(void* object, size_t size) {
    // Convert the object to a memory block
    MemBlock* memBlock = reinterpret_cast<MemBlock*>(reinterpret_cast<unsigned char*>(object) - BLOCK_HEADER_SIZE);
    unsigned int* footer = reinterpret_cast<unsigned int*>(reinterpret_cast<unsigned char*>(object) + memBlock->size);

    // If the signature does not match, handle it as a regular delete[]
    if (memBlock->signature != HEADER_SIGNATURE || *footer != FOOTER_SIGNATURE) {
        delete[] reinterpret_cast<unsigned char*>(object);  // Handle incorrect block
        return;
    }

    int index = findFreeListIndex(memBlock->size);  // Find the index that matches the block size

    mutex->lock();  // Lock the Mutex
    memBlock->next = freeBlockEntryList[index].head;  // Add the block to the head of the free block list
    freeBlockEntryList[index].head = memBlock;    // Add the block to the head of the free block list
    mutex->unlock();  // Unlock the Mutex
}

int CustomAllocator::findFreeListIndex(size_t size) {
    size = ALIGN(size, MIN_BLOCK_SIZE);  // Align the requested size
    int index = 0;
    size_t block_size = MIN_BLOCK_SIZE;

    while (block_size < size && index < FREE_BLOCK_ENTRY_SIZE - 1) {
        block_size <<= 1;  // 8, 16, 32, 64, 128, 256, ..., 134217728
        index++;
    }
    return index;  // Return the appropriate index
}

// Function to allocate memory blocks
CustomAllocator::MemBlock* CustomAllocator::allocateMemBlocks(size_t size, size_t numBlocks) {
    // Calculate the block size (including header and footer)
    size_t blockSize = ALIGN(size + BLOCK_HEADER_SIZE, MIN_BLOCK_SIZE) + BLOCK_FOOTER_SIZE;

    MemChunk* currentMemChunk = NULL;

    try {
        currentMemChunk = new MemChunk;  // Allocate a new memory chunk
        currentMemChunk->payload = new unsigned char[numBlocks * blockSize];  // Allocate memory to hold the requested number of blocks
    }
    catch (std::bad_alloc& ex) {
        printf("CustomAllocator::allocateMemBlocks() Stack Overflow!! - %s\n", ex.what());  // Handle memory allocation failure
        delete currentMemChunk;  // Delete the allocated memory chunk
        return NULL;  // Return NULL
    }

    memChunkList.push_back(currentMemChunk);  // Add the memory chunk to the list

    MemBlock* firstBlock = reinterpret_cast<MemBlock*>(currentMemChunk->payload);
    MemBlock* currentBlock = firstBlock;

    for (size_t i = 0; i < numBlocks; ++i) {
        currentBlock->size = static_cast<unsigned int>(size);  // Store the requested size
        currentBlock->signature = HEADER_SIGNATURE;  // Set the header signature

        // Store the signature in the block footer
        unsigned int* footer = reinterpret_cast<unsigned int*>(reinterpret_cast<unsigned char*>(currentBlock) + blockSize - BLOCK_FOOTER_SIZE);
        *footer = FOOTER_SIGNATURE;

        // Set the next block
        if (i < numBlocks - 1) {
            currentBlock->next = reinterpret_cast<MemBlock*>(reinterpret_cast<unsigned char*>(currentBlock) + blockSize);
            currentBlock = currentBlock->next;
        }
        else {
            currentBlock->next = NULL;  // For the last block, set next to NULL
        }
    }
    return firstBlock;  // Return the pointer to the first block
}