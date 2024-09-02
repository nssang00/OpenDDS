#include <windows.h>
#include <vector>
#include <stdexcept>
#include <cstdio>

class CustomAllocator {
public:
    CustomAllocator();
    ~CustomAllocator();
    void* allocate(size_t size);
    void free(void* object, size_t size);

    static CustomAllocator* Instance(int num = 0);

private:
    static const size_t HEADER_SIGNATURE = 0xAA435453L;
    static const size_t FOOTER_SIGNATURE = 0xBB21474DL;

    static const int MEM_POOL_SIZE = 32 * 1024;  // 32KB
    static const int FREE_BLOCK_ENTRY_SIZE = 24; // 24(128MB)

    static const int MIN_BLOCK_SIZE = 8;
    static const int MAX_BLOCK_SIZE = 4096;
    static const int MEM_MANAGER_SIZE = 2;
    static const int MAX_BLOCKS_PER_ENTRY = 1024;  // 할당할 수 있는 최대 블록 수
    static const int MIN_BLOCKS_PER_ENTRY = 1;
    static const int HIT_COUNT_THRESHOLD = 10;    // 블록 확장을 위한 임계값

    #define ALIGN(size, alignment) (((size) + (alignment - 1)) & ~(alignment - 1))
    #define BLOCK_HEADER_SIZE ALIGN(sizeof(MemBlock) - sizeof(unsigned char*), MIN_BLOCK_SIZE)
    #define BLOCK_FOOTER_SIZE sizeof(size_t)

    struct MemBlock {
        size_t headerSignature;
        size_t size;
        struct MemBlock* next;
        unsigned char* payload;
    };

    struct MemChunk {
        unsigned char* payload;
    };

    struct FreeBlockEntry {
        size_t size;
        struct MemBlock* head;
        size_t hitCount;   // 추가된 hit count
        size_t numBlocks;  // 현재 크기의 블록 수
    };

    static CustomAllocator* instance[MEM_MANAGER_SIZE];

    std::vector<MemChunk*> memChunkList;
    FreeBlockEntry freeBlockEntryList[FREE_BLOCK_ENTRY_SIZE];
    Mutex* mutex;

    MemBlock* allocateMemBlocks(size_t size, size_t numBlocks);

    int findFreeListIndex(size_t size) {
        size = ALIGN(size, MIN_BLOCK_SIZE); // 정렬
        int index = 0;
        size_t block_size = MIN_BLOCK_SIZE;

        while (block_size < size && index < FREE_BLOCK_ENTRY_SIZE - 1) {
            block_size <<= 1; // 2배씩 증가
            index++;
        }
        return index;
    }
};

CustomAllocator* CustomAllocator::instance[MEM_MANAGER_SIZE] = { NULL, NULL };

CustomAllocator::CustomAllocator() {
    for (int i = 0; i < FREE_BLOCK_ENTRY_SIZE; i++) {
        freeBlockEntryList[i].size = MIN_BLOCK_SIZE << i;
        freeBlockEntryList[i].head = NULL;
        freeBlockEntryList[i].hitCount = 0;  // hitCount 초기화
        freeBlockEntryList[i].numBlocks = max(MEM_POOL_SIZE / (freeBlockEntryList[i].size + BLOCK_HEADER_SIZE + BLOCK_FOOTER_SIZE), (size_t)MIN_BLOCKS_PER_ENTRY);
    }
    mutex = new Mutex;
}

CustomAllocator::~CustomAllocator() {
    for (std::vector<MemChunk*>::iterator it = memChunkList.begin(); it != memChunkList.end(); ++it) {
        MemChunk* memChunk = *it;
        delete[] memChunk->payload;
        delete memChunk;
    }
    memChunkList.clear();
    delete mutex;
}

CustomAllocator* CustomAllocator::Instance(int num) {
    if (!instance[num])
        instance[num] = new CustomAllocator();
    return instance[num];
}

void* CustomAllocator::allocate(size_t size) {
    size = ALIGN(size + BLOCK_HEADER_SIZE + BLOCK_FOOTER_SIZE, MIN_BLOCK_SIZE); // 정렬 및 헤더, 푸터 크기 포함
    int index = findFreeListIndex(size);
    size_t newSize = freeBlockEntryList[index].size;

    mutex->lock();

    MemBlock* memBlock = freeBlockEntryList[index].head;

    if (!memBlock) {
        freeBlockEntryList[index].hitCount++;

        if (freeBlockEntryList[index].hitCount >= HIT_COUNT_THRESHOLD && freeBlockEntryList[index].numBlocks < MAX_BLOCKS_PER_ENTRY) {
            freeBlockEntryList[index].numBlocks = min(freeBlockEntryList[index].numBlocks * 2, MAX_BLOCKS_PER_ENTRY);
            freeBlockEntryList[index].hitCount = 0;  // hitCount 초기화
        }

        memBlock = allocateMemBlocks(newSize, freeBlockEntryList[index].numBlocks);
    }

    if (memBlock) {
        freeBlockEntryList[index].head = memBlock->next;
    }

    mutex->unlock();

    if (memBlock) {
        // 푸터 설정
        size_t* footer = reinterpret_cast<size_t*>(reinterpret_cast<unsigned char*>(memBlock) + size - BLOCK_FOOTER_SIZE);
        *footer = FOOTER_SIGNATURE;
    }

    return memBlock ? (void*)&(memBlock->payload) : NULL;
}

void CustomAllocator::free(void* object, size_t size) {
    MemBlock* memBlock = (MemBlock*)((char*)object - BLOCK_HEADER_SIZE);
    size_t* footer = (size_t*)((char*)object + memBlock->size);

    if (memBlock->headerSignature != HEADER_SIGNATURE || *footer != FOOTER_SIGNATURE) {
        (size == 1) ? delete (char*)object : delete[](char*)object;
        return;
    }

    int index = findFreeListIndex(memBlock->size);

    mutex->lock();
    memBlock->next = freeBlockEntryList[index].head;
    freeBlockEntryList[index].head = memBlock;
    mutex->unlock();
}

CustomAllocator::MemBlock* CustomAllocator::allocateMemBlocks(size_t size, size_t numBlocks) {
    size_t blockSize = size + BLOCK_HEADER_SIZE + BLOCK_FOOTER_SIZE;

    MemChunk* currentMemChunk = NULL;

    try {
        currentMemChunk = new MemChunk;
        currentMemChunk->payload = new unsigned char[numBlocks * blockSize];
    } catch (std::bad_alloc& ex) {
        printf("CustomAllocator::allocateMemBlocks() Stack Overflow!! - %s\n", ex.what());
        delete currentMemChunk;
        return NULL;
    }

    memChunkList.push_back(currentMemChunk);

    MemBlock* firstBlock = reinterpret_cast<MemBlock*>(currentMemChunk->payload);
    MemBlock* currentBlock = firstBlock;

    for (size_t i = 0; i < numBlocks; ++i) {
        currentBlock->size = size;
        currentBlock->headerSignature = HEADER_SIGNATURE;

        size_t* footer = reinterpret_cast<size_t*>(reinterpret_cast<unsigned char*>(currentBlock) + blockSize - BLOCK_FOOTER_SIZE);
        *footer = FOOTER_SIGNATURE;

        if (i < numBlocks - 1) {
            currentBlock->next = reinterpret_cast<MemBlock*>(reinterpret_cast<unsigned char*>(currentBlock) + blockSize);
            currentBlock = currentBlock->next;
        } else {
            currentBlock->next = NULL;
        }
    }

    return firstBlock;
}
