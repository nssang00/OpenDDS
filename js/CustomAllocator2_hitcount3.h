#define MEM_POOL_SIZE (32 * 1024)  // 32KB
#define MIN_CAPACITY 1
#define FREE_BLOCK_ENTRY_SIZE 24   // 24(128MB)
#define MAX_BLOCKS_PER_ENTRY 1024  // 각 FreeBlockEntry당 최대 블록 수
#define HIT_COUNT_THRESHOLD 10     // 블록 확장 트리거 히트 카운트
#define MAX_MEMORY_POOL_SIZE (64 * 1024 * 1024)  // 64MB, 메모리 풀이 사용할 수 있는 최대 크기
#define MIN_BLOCK_SIZE 16          // 블록의 최소 크기 정의
#define ALIGN(size, alignment) (((size) + (alignment - 1)) & ~(alignment - 1))
#define BLOCK_HEADER_SIZE ALIGN(sizeof(MemoryBlockHeader), MIN_BLOCK_SIZE)

#include <windows.h>
#include <vector>
#include <stdexcept>
#include <cstdio>

class Mutex {
public:
    Mutex() { InitializeCriticalSection(&cs); }
    ~Mutex() { DeleteCriticalSection(&cs); }
    void lock() { EnterCriticalSection(&cs); }
    void unlock() { LeaveCriticalSection(&cs); }

private:
    CRITICAL_SECTION cs;
};

class CustomAllocator {
public:
    CustomAllocator();
    ~CustomAllocator();
    void* allocate(size_t size);
    void free(void* object);

    static CustomAllocator* Instance(int num = 0);

private:
    static const unsigned long HEADER_SIGNATURE = 0xDEADBEEF;
    static const unsigned long FOOTER_SIGNATURE = 0xFEEDFACE;

    struct MemoryBlockHeader {
        unsigned long signature;
        size_t size;
        struct MemoryBlockHeader* next;
    };

    struct MemoryBlockFooter {
        unsigned long signature;
    };

    struct FreeBlockEntry {
        size_t size;
        MemoryBlockHeader* head;
        size_t hitCount;
        size_t numBlocks;
    };

    static CustomAllocator* instance[MEM_MANAGER_SIZE];

    MemoryBlockHeader* allocateMemBlocks(size_t size, size_t numBlocks);
    size_t calculateCurrentMemoryUsage();

    std::vector<unsigned char*> memChunkList;
    FreeBlockEntry freeBlockEntryList[FREE_BLOCK_ENTRY_SIZE];
    Mutex* mutex;

    int findFreeListIndex(size_t size);
};

CustomAllocator* CustomAllocator::instance[MEM_MANAGER_SIZE] = { NULL, NULL };

CustomAllocator::CustomAllocator() {
    for (int i = 0; i < FREE_BLOCK_ENTRY_SIZE; i++) {
        freeBlockEntryList[i].size = MIN_BLOCK_SIZE << i;
        freeBlockEntryList[i].head = NULL;
        freeBlockEntryList[i].hitCount = 0;
        freeBlockEntryList[i].numBlocks = std::max(MEM_POOL_SIZE / 
            (freeBlockEntryList[i].size + sizeof(MemoryBlockHeader) + sizeof(MemoryBlockFooter)), 
            (size_t)MIN_CAPACITY);
    }
    mutex = new Mutex;
}

CustomAllocator::~CustomAllocator() {
    for (size_t i = 0; i < memChunkList.size(); ++i) {
        delete[] memChunkList[i];
    }
    memChunkList.clear();
    delete mutex;
}

CustomAllocator* CustomAllocator::Instance(int num) {
    if (!instance[num])
        instance[num] = new CustomAllocator();
    return instance[num];
}

int CustomAllocator::findFreeListIndex(size_t size) {
    int index = 0;
    size_t block_size = MIN_BLOCK_SIZE;

    while (block_size < size && index < FREE_BLOCK_ENTRY_SIZE - 1) {
        block_size <<= 1;
        index++;
    }
    return index;
}

size_t CustomAllocator::calculateCurrentMemoryUsage() {
    size_t totalUsage = 0;
    for (size_t i = 0; i < memChunkList.size(); ++i) {
        totalUsage += _msize(memChunkList[i]);  // 현재 메모리 청크의 크기를 가져옴
    }
    return totalUsage;
}

void* CustomAllocator::allocate(size_t size) {
    size = ALIGN(size, MIN_BLOCK_SIZE);  // 정렬
    size += BLOCK_HEADER_SIZE;           // 헤더 크기 포함

    int index = findFreeListIndex(size);     // 적절한 인덱스를 계산

    MemoryBlockHeader* memBlock = NULL;

    mutex->lock();

    memBlock = freeBlockEntryList[index].head;

    if (!memBlock) {
        freeBlockEntryList[index].hitCount++;

        // hitCount가 임계값을 넘으면 numBlocks를 증가시킴
        if (freeBlockEntryList[index].hitCount >= HIT_COUNT_THRESHOLD) {
            size_t suggestedNumBlocks = freeBlockEntryList[index].numBlocks * 2;
            size_t currentMemoryUsage = calculateCurrentMemoryUsage();
            size_t availableMemory = MAX_MEMORY_POOL_SIZE - currentMemoryUsage;

            if (availableMemory > freeBlockEntryList[index].size * suggestedNumBlocks) {
                freeBlockEntryList[index].numBlocks = std::min(suggestedNumBlocks, (size_t)MAX_BLOCKS_PER_ENTRY);
            } else {
                freeBlockEntryList[index].numBlocks = availableMemory / freeBlockEntryList[index].size;
            }

            freeBlockEntryList[index].hitCount = 0;
        }

        memBlock = allocateMemBlocks(freeBlockEntryList[index].size, freeBlockEntryList[index].numBlocks);
    }

    if (memBlock) {
        freeBlockEntryList[index].head = memBlock->next;
    }

    mutex->unlock();

    return memBlock ? reinterpret_cast<void*>(reinterpret_cast<unsigned char*>(memBlock) + sizeof(MemoryBlockHeader)) : NULL;
}

void CustomAllocator::free(void* object) {
    if (!object) return;

    MemoryBlockHeader* header = reinterpret_cast<MemoryBlockHeader*>(
        reinterpret_cast<unsigned char*>(object) - sizeof(MemoryBlockHeader)
    );

    if (header->signature != HEADER_SIGNATURE) {
        throw std::runtime_error("Invalid memory block header");
    }

    size_t allocatedSize = ALIGN(header->size, MIN_BLOCK_SIZE);

    MemoryBlockFooter* footer = reinterpret_cast<MemoryBlockFooter*>(
        reinterpret_cast<unsigned char*>(object) + allocatedSize
    );

    if (footer->signature != FOOTER_SIGNATURE) {
        throw std::runtime_error("Memory overrun detected");
    }

    int index = findFreeListIndex(header->size + sizeof(MemoryBlockHeader) + sizeof(MemoryBlockFooter));

    mutex->lock();
    header->next = freeBlockEntryList[index].head;
    freeBlockEntryList[index].head = header;
    mutex->unlock();
}

CustomAllocator::MemoryBlockHeader* CustomAllocator::allocateMemBlocks(size_t size, size_t numBlocks) {
    size_t blockSize = size + sizeof(MemoryBlockHeader) + sizeof(MemoryBlockFooter);
    size_t totalSize = numBlocks * blockSize;

    // 메모리 청크 할당
    unsigned char* payload = new unsigned char[totalSize];
    memChunkList.push_back(payload);

    MemoryBlockHeader* firstBlock = reinterpret_cast<MemoryBlockHeader*>(payload);

    // 메모리 블록 체인 설정
    for (size_t i = 0; i < numBlocks; ++i) {
        MemoryBlockHeader* currentBlock = reinterpret_cast<MemoryBlockHeader*>(payload + i * blockSize);
        
        currentBlock->signature = HEADER_SIGNATURE;
        currentBlock->size = size;

        // 다음 블록을 연결
        if (i < numBlocks - 1) {
            currentBlock->next = reinterpret_cast<MemoryBlockHeader*>(payload + (i + 1) * blockSize);
        } else {
            currentBlock->next = NULL;
        }

        // Footer 설정
        MemoryBlockFooter* footer = reinterpret_cast<MemoryBlockFooter*>(reinterpret_cast<unsigned char*>(currentBlock) + sizeof(MemoryBlockHeader) + size);
        footer->signature = FOOTER_SIGNATURE;
    }

    return firstBlock;
}
