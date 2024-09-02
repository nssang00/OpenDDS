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
    // 상수 및 매크로
    static const size_t SDDS_MEMORY_MANAGER_SIGNATURE1 = 0xAA435453L;
    static const size_t SDDS_MEMORY_MANAGER_SIGNATURE2 = 0xBB21474DL;

    static const int MEM_POOL_SIZE = 32 * 1024;  // 32KB
    static const int MIN_CAPACITY = 1;
    static const int FREE_BLOCK_ENTRY_SIZE = 24; // 24(128MB)

    static const int MIN_BLOCK_SIZE = 8;
    static const int MAX_BLOCK_SIZE = 4096;
    static const int BLOCK_ENTRY_SIZE = MAX_BLOCK_SIZE / MIN_BLOCK_SIZE;
    static const int MEM_MANAGER_SIZE = 2;
    static const size_t MAX_BLOCKS_PER_ENTRY = 1024;  // 할당할 수 있는 최대 블록 수
    static const int HIT_COUNT_THRESHOLD = 10;    // 블록 확장을 위한 임계값

    #define ALIGN(size, alignment) (((size) + (alignment - 1)) & ~(alignment - 1))
    #define BLOCK_HEADER_SIZE ALIGN(sizeof(MemBlock), MIN_BLOCK_SIZE)

    // 구조체 정의
    typedef struct _MemBlock {
        size_t signature1;
        size_t signature2;
        size_t size;
        struct _MemBlock* next;
        unsigned char* payload;
    } MemBlock;

    typedef struct _MemChunk {
        unsigned char* payload;
    } MemChunk;

    typedef struct _FreeBlockEntry {
        size_t size;
        struct _MemBlock* head;
        size_t hitCount;   // 추가된 hit count
        size_t numBlocks;  // 현재 크기의 블록 수
    } FreeBlockEntry;

    // 멤버 변수
    static CustomAllocator* instance[MEM_MANAGER_SIZE];

    std::vector<MemChunk*> memChunkList;
    FreeBlockEntry freeBlockEntryList[FREE_BLOCK_ENTRY_SIZE];
    Mutex* mutex;

    // 멤버 함수
    MemBlock* allocateMemBlocks(size_t size, size_t numBlocks);

    int findFreeListIndex(size_t size) {
        size += BLOCK_HEADER_SIZE; // 헤더 크기 포함
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

// 정적 변수 초기화
CustomAllocator* CustomAllocator::instance[MEM_MANAGER_SIZE] = { NULL, NULL };

CustomAllocator::CustomAllocator() {
    for (int i = 0; i < FREE_BLOCK_ENTRY_SIZE; i++) {
        freeBlockEntryList[i].size = MIN_BLOCK_SIZE << i;
        freeBlockEntryList[i].head = NULL;
        freeBlockEntryList[i].hitCount = 0;  // hitCount 초기화
        freeBlockEntryList[i].numBlocks = max(MEM_POOL_SIZE / (freeBlockEntryList[i].size + BLOCK_HEADER_SIZE), (size_t)MIN_CAPACITY);
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
    size = ALIGN(size + BLOCK_HEADER_SIZE, MIN_BLOCK_SIZE); // 정렬 및 헤더 크기 포함
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

    return memBlock ? (void*)&(memBlock->payload) : NULL;
}

void CustomAllocator::free(void* object, size_t size) {
    MemBlock* memBlock = (MemBlock*)((char*)object - BLOCK_HEADER_SIZE);

    if ((memBlock->signature1 != SDDS_MEMORY_MANAGER_SIGNATURE1) ||
        (memBlock->signature2 != SDDS_MEMORY_MANAGER_SIGNATURE2)) {
        (size == 1) ? delete (char*)object : delete[](char*)object;
        return;
    }

    size = ALIGN(memBlock->size + BLOCK_HEADER_SIZE, MIN_BLOCK_SIZE); // 정렬 및 헤더 크기 포함
    int index = findFreeListIndex(size);

    mutex->lock();
    memBlock->next = freeBlockEntryList[index].head;
    freeBlockEntryList[index].head = memBlock;
    mutex->unlock();
}

CustomAllocator::MemBlock* CustomAllocator::allocateMemBlocks(size_t size, size_t numBlocks) {
    size_t blockSize = size + BLOCK_HEADER_SIZE;

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
        currentBlock->signature1 = SDDS_MEMORY_MANAGER_SIGNATURE1;
        currentBlock->signature2 = SDDS_MEMORY_MANAGER_SIGNATURE2;

        if (i < numBlocks - 1) {
            currentBlock->next = reinterpret_cast<MemBlock*>(reinterpret_cast<unsigned char*>(currentBlock) + blockSize);
            currentBlock = currentBlock->next;
        } else {
            currentBlock->next = NULL;
        }
    }

    return firstBlock;
}
