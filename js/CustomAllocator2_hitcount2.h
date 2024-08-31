#define MEM_POOL_SIZE (32 * 1024)  // 32KB
#define MIN_CAPACITY 1
#define FREE_BLOCK_ENTRY_SIZE 24 //24(128MB)

#include <windows.h>
#include <vector>
#include <stdexcept>
#include <cstdio>

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

    static CustomAllocator* instance[MEM_MANAGER_SIZE];

    MemoryBlockHeader* allocateMemBlocks(size_t size, size_t numBlocks);

    std::vector<unsigned char*> memChunkList;
    FreeBlockEntry freeBlockEntryList[FREE_BLOCK_ENTRY_SIZE];
    Mutex* mutex;
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
    for (auto& memChunk : memChunkList) {
        delete[] memChunk;
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
    int index = -1;
    size_t newSize = 0;

    MemoryBlockHeader* memBlock = nullptr;

    for (int i = 0; i < FREE_BLOCK_ENTRY_SIZE; i++) {
        if (size <= freeBlockEntryList[i].size) {
            index = i;
            newSize = freeBlockEntryList[i].size;
            break;
        }
    }
    if (index == -1)
        return nullptr;

    mutex->lock();

    memBlock = freeBlockEntryList[index].head;

    if (!memBlock) {
        freeBlockEntryList[index].hitCount++;

        if (freeBlockEntryList[index].hitCount >= HIT_COUNT_THRESHOLD && freeBlockEntryList[index].numBlocks < MAX_TOTAL_BLOCKS) {
            freeBlockEntryList[index].numBlocks = min(freeBlockEntryList[index].numBlocks * 2, MAX_TOTAL_BLOCKS);
            freeBlockEntryList[index].hitCount = 0;  // hitCount 초기화
        }

        memBlock = allocateMemBlocks(newSize, freeBlockEntryList[index].numBlocks);
    }

    if (memBlock) {
        freeBlockEntryList[index].head = memBlock->next;
    }

    mutex->unlock();

    return memBlock ? reinterpret_cast<void*>(reinterpret_cast<unsigned char*>(memBlock) + sizeof(MemoryBlockHeader)) : nullptr;
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

    int index = -1;

    for (int i = 0; i < FREE_BLOCK_ENTRY_SIZE; i++) {
        if (header->size <= freeBlockEntryList[i].size) {
            index = i;
            break;
        }
    }

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
