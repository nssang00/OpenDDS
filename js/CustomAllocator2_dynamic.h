#define SDDS_MEMORY_MANAGER_MAGIC_NUMBER1       0xAA435453L
#define SDDS_MEMORY_MANAGER_MAGIC_NUMBER2       0xBB21474DL

#define MEM_POOL_SIZE (32 * 1024)  // 32KB
#define MIN_CAPACITY 1
#define FREE_BLOCK_ENTRY_SIZE 24 //24(128MB)

#include <windows.h>
#include <vector>
#include <stdexcept>
#include <cstdio>

class Mutex {
public:
    Mutex();
    ~Mutex();

    void lock();
    void unlock();

private:
    CRITICAL_SECTION cs;
};

Mutex::Mutex() {
    InitializeCriticalSection(&cs);
}

Mutex::~Mutex() {
    DeleteCriticalSection(&cs);
}

void Mutex::lock() {
    EnterCriticalSection(&cs);
}

void Mutex::unlock() {
    LeaveCriticalSection(&cs);
}

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
} FreeBlockEntry;

const int MIN_BLOCK_SIZE = 8;
const int MAX_BLOCK_SIZE = 4096;
const int BLOCK_ENTRY_SIZE = MAX_BLOCK_SIZE / MIN_BLOCK_SIZE;
const int BLOCK_HEADER_SIZE = sizeof(struct _MemBlock) - sizeof(unsigned char*);
const int BLOCK_FOOTER_SIZE = 0;
const int MEM_MANAGER_SIZE = 2;

class CustomAllocator {
public:
    CustomAllocator();
    ~CustomAllocator();
    void* allocate(size_t size);
    void free(void* object, size_t size);

    static CustomAllocator* Instance(int num = 0);

private:
    static CustomAllocator* instance[MEM_MANAGER_SIZE];

    MemBlock* allocateMemBlocks(size_t size);

    std::vector<MemChunk*> memChunkList;
    FreeBlockEntry freeBlockEntryList[FREE_BLOCK_ENTRY_SIZE];
    Mutex* mutex;
};

CustomAllocator* CustomAllocator::instance[MEM_MANAGER_SIZE] = { NULL, NULL };

CustomAllocator::CustomAllocator() {
    for (int i = 0; i < FREE_BLOCK_ENTRY_SIZE; i++) {
        freeBlockEntryList[i].size = MIN_BLOCK_SIZE << i;
        freeBlockEntryList[i].head = NULL;
    }
    mutex = new Mutex;
}

CustomAllocator::~CustomAllocator() {
    // 메모리 청크 리스트의 모든 메모리 청크 해제
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
    int index = -1;
    int newSize = 0;

    MemBlock* memBlock = NULL;

    for (int i = 0; i < FREE_BLOCK_ENTRY_SIZE; i++) {
        if (size <= freeBlockEntryList[i].size) {
            index = i;
            newSize = freeBlockEntryList[i].size;
            break;
        }
    }
    if (index == -1)
        return NULL;

    mutex->lock();

    memBlock = freeBlockEntryList[index].head;

    if (!memBlock) {
        memBlock = allocateMemBlocks(newSize);
    }

    if (memBlock) {
        freeBlockEntryList[index].head = memBlock->next;
    }

    mutex->unlock();

    return memBlock ? (void*)&(memBlock->payload) : NULL;
}

void CustomAllocator::free(void* object, size_t size) {
    MemBlock* memBlock = (MemBlock*)((char*)object - BLOCK_HEADER_SIZE);

    if ((memBlock->signature1 != SDDS_MEMORY_MANAGER_MAGIC_NUMBER1) ||
        (memBlock->signature2 != SDDS_MEMORY_MANAGER_MAGIC_NUMBER2)) {
        (size == 1) ? delete (char*)object : delete[](char*)object;
        return;
    }

    int index = -1;

    for (int i = 0; i < FREE_BLOCK_ENTRY_SIZE; i++) {
        if (memBlock->size <= freeBlockEntryList[i].size) {
            index = i;
            break;
        }
    }

    mutex->lock();
    memBlock->next = freeBlockEntryList[index].head;
    freeBlockEntryList[index].head = memBlock;
    mutex->unlock();
}

MemBlock* CustomAllocator::allocateMemBlocks(size_t size) {
    size_t blockSize = size + BLOCK_HEADER_SIZE + BLOCK_FOOTER_SIZE;

    // 새로운 메모리 청크 할당
    MemChunk* currentMemChunk = new MemChunk;
    size_t numBlocks = max(MEM_POOL_SIZE / blockSize, (size_t)MIN_CAPACITY);

    try {
        currentMemChunk->payload = new unsigned char[numBlocks * blockSize];
    } catch (std::bad_alloc& ex) {
        printf("CustomAllocator::allocateMemBlocks() Stack Overflow!! - %s\n", ex.what());
        delete currentMemChunk;
        return NULL;
    }

    memChunkList.push_back(currentMemChunk);

    // 메모리 청크에서 블록 생성 및 연결
    unsigned char* start = currentMemChunk->payload;
    MemBlock* firstBlock = NULL;
    MemBlock* previousBlock = NULL;

    for (size_t i = 0; i < numBlocks; ++i) {
        MemBlock* newBlock = reinterpret_cast<MemBlock*>(start + i * blockSize);

        // 메모리 블록 초기화
        newBlock->size = size;
        newBlock->signature1 = SDDS_MEMORY_MANAGER_MAGIC_NUMBER1;
        newBlock->signature2 = SDDS_MEMORY_MANAGER_MAGIC_NUMBER2;
        newBlock->next = NULL;

        if (previousBlock != NULL) {
            previousBlock->next = newBlock;
        } else {
            firstBlock = newBlock;
        }
        previousBlock = newBlock;
    }

    return firstBlock;
}
