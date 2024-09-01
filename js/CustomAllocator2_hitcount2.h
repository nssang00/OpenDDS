#define MEM_POOL_SIZE (32 * 1024)  // 32KB
#define MIN_CAPACITY 1
#define FREE_BLOCK_ENTRY_SIZE 24   // 24(128MB)
#define MAX_BLOCKS_PER_ENTRY 1024  // 각 FreeBlockEntry당 최대 블록 수
#define HIT_COUNT_THRESHOLD 10     // 블록 확장 트리거 히트 카운트

#define ALIGN(size, alignment) (((size) + (alignment - 1)) & ~(alignment - 1))
#define BLOCK_HEADER_SIZE ALIGN(sizeof(MemoryBlockHeader), MIN_BLOCK_SIZE)


const int MIN_BLOCK_SIZE = 8;
const int MAX_BLOCK_SIZE = 4096;
const int BLOCK_ENTRY_SIZE = MAX_BLOCK_SIZE / MIN_BLOCK_SIZE;
const int BLOCK_HEADER_SIZE = sizeof(struct _MemBlock) - sizeof(unsigned char*);
const int BLOCK_FOOTER_SIZE = 0;
const int MEM_MANAGER_SIZE = 2;


#include <windows.h>
#include <vector>  // STL 사용을 최소화합니다. 필요한 경우 동적 배열로 대체 가능
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
        freeBlockEntryList[i].hitCount = 0;  // hitCount 초기화
        freeBlockEntryList[i].numBlocks = max(MEM_POOL_SIZE / (freeBlockEntryList[i].size + sizeof(MemoryBlockHeader) + sizeof(MemoryBlockFooter)), (size_t)MIN_CAPACITY);
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
        block_size <<= 1; // 2배씩 증가
        index++;
    }
    return index;
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

        if (freeBlockEntryList[index].hitCount >= HIT_COUNT_THRESHOLD && freeBlockEntryList[index].numBlocks < MAX_BLOCKS_PER_ENTRY) {
            freeBlockEntryList[index].numBlocks = min(freeBlockEntryList[index].numBlocks * 2, (size_t)MAX_BLOCKS_PER_ENTRY);
            freeBlockEntryList[index].hitCount = 0;  // hitCount 초기화
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

    MemoryBlockFooter* footer = reinterpret_cast<MemoryBlockFooter*>(
        reinterpret_cast<unsigned char*>(object) + header->size
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
