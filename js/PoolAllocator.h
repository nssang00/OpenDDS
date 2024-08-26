#include <cstddef>
#include <cassert>
#include <vector>

class PoolAllocator {
public:
    PoolAllocator(size_t blockSize, size_t blockCount);
    ~PoolAllocator();

    void* allocate(size_t size);
    void free(void* ptr, size_t size);

    static PoolAllocator* Instance(size_t blockSize = 0, size_t blockCount = 0);

private:
    struct Block {
        Block* next;
    };

    Block* freeList;
    std::vector<void*> poolMemory;
    size_t blockSize;
    size_t blockCount;

    void expandPoolSize();
    void addBlock(void* block);
};

// Singleton instance
PoolAllocator* PoolAllocator::Instance(size_t blockSize, size_t blockCount) {
    static PoolAllocator instance(blockSize, blockCount);
    return &instance;
}

// Constructor
PoolAllocator::PoolAllocator(size_t blockSize, size_t blockCount)
    : freeList(NULL), blockSize(blockSize), blockCount(blockCount) {
    expandPoolSize();
}

// Destructor
PoolAllocator::~PoolAllocator() {
    for (size_t i = 0; i < poolMemory.size(); ++i) {
        delete[] static_cast<char*>(poolMemory[i]);
    }
}

// Allocate memory
void* PoolAllocator::allocate(size_t size) {
    if (size > blockSize || freeList == NULL) {
        // 요청된 크기가 블록 크기보다 크거나, 메모리가 부족한 경우
        return NULL;
    }

    // Free list에서 블록을 할당
    Block* head = freeList;
    freeList = head->next;
    return head;
}

// Free memory
void PoolAllocator::free(void* ptr, size_t size) {
    if (ptr == NULL || size > blockSize) {
        return;
    }

    // 반환된 블록을 Free list의 맨 앞에 추가
    Block* block = static_cast<Block*>(ptr);
    block->next = freeList;
    freeList = block;
}

// Expand pool size
void PoolAllocator::expandPoolSize() {
    size_t size = blockSize > sizeof(Block*) ? blockSize : sizeof(Block*);
    void* newBlock = new char[size * blockCount];
    poolMemory.push_back(newBlock);

    for (size_t i = 0; i < blockCount; ++i) {
        addBlock(static_cast<char*>(newBlock) + i * size);
    }
}

// Add block to the free list
void PoolAllocator::addBlock(void* block) {
    Block* newBlock = static_cast<Block*>(block);
    newBlock->next = freeList;
    freeList = newBlock;
}
