#define SDDS_MEMORY_MANAGER_MAGIC_NUMBER1       0xAA435453L
#define SDDS_MEMORY_MANAGER_MAGIC_NUMBER2       0xBB21474DL

#define MEM_POOL_SIZE (32 * 1024)  // 32KB
#define MIN_CAPACITY 1

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

typedef struct _MemPool {
    unsigned char* payload;
    int curPos;
    int size;
} MemPool;

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

    bool allocMemPool(int size);
    bool freeMemPool();
    MemBlock* getMemBlockFromMemPool(int size);

    MemPool* nowMemPool;
    std::vector<MemPool*> memPoolList;

    FreeBlockEntry freeBlockEntryList[BLOCK_ENTRY_SIZE];
    unsigned int freeBlockEntryListSize[BLOCK_ENTRY_SIZE];
    Mutex* mutex;
};

CustomAllocator* CustomAllocator::instance[MEM_MANAGER_SIZE] = { nullptr, nullptr };

CustomAllocator::CustomAllocator() {
    allocMemPool(MAX_BLOCK_SIZE);
    for (int i = 0; i < BLOCK_ENTRY_SIZE; i++) {
        freeBlockEntryList[i].size = MIN_BLOCK_SIZE << i;
        freeBlockEntryList[i].head = NULL;  // VS2008에서는 nullptr 대신 NULL 사용
        freeBlockEntryListSize[i] = 0;
    }
    mutex = new Mutex;
    nowMemPool = NULL;  
}

CustomAllocator::~CustomAllocator() {
    freeMemPool();
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

    MemBlock* memBlock;

    for (int i = 0; i < BLOCK_ENTRY_SIZE; i++) {
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
        memBlock = getMemBlockFromMemPool(newSize);
    }

    if (memBlock) {
        freeBlockEntryList[index].head = memBlock->next;
        freeBlockEntryListSize[index]--;
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

    for (int i = 0; i < BLOCK_ENTRY_SIZE; i++) {
        if (memBlock->size <= freeBlockEntryList[i].size) {
            index = i;
            break;
        }
    }

    mutex->lock();
    memBlock->next = freeBlockEntryList[index].head;
    freeBlockEntryList[index].head = memBlock;
    freeBlockEntryListSize[index]++;
    mutex->unlock();
}

bool CustomAllocator::freeMemPool() {
    for (size_t i = 0; i < memPoolList.size(); i++) { 
        MemPool* memPool = memPoolList[i];
        delete[] memPool->payload;
        delete memPool;
    }
    memPoolList.clear();
    nowMemPool = NULL;  

    return true;
}

bool CustomAllocator::allocMemPool(size_t size) {
    size_t totalBlockSize = size + BLOCK_HEADER_SIZE + BLOCK_FOOTER_SIZE;

    // MEM_POOL_SIZE로 할당할 수 있는 블록 수를 계산하여 capacity 변수에 저장
    //size_t capacity = (MEM_POOL_SIZE / totalBlockSize) < 1 ? 1 : MEM_POOL_SIZE / totalBlockSize;
    size_t capacity = max(MEM_POOL_SIZE / totalBlockSize, MIN_CAPACITY);

    // 필요한 메모리 크기
    size_t requiredSize = capacity * totalBlockSize;

    // 메모리 풀을 할당
    nowMemPool = new MemPool;
    try {
        nowMemPool->payload = new unsigned char[requiredSize];
    } catch (std::bad_alloc& ex) {
        printf("CustomAllocator::allocMemPool() Stack OverFlow!! - %s\n", ex.what());
        delete nowMemPool;
        nowMemPool = NULL;
        return false;
    }

    nowMemPool->curPos = 0;
    nowMemPool->size = (int)requiredSize;
    memPoolList.push_back(nowMemPool);
    return true;
}

MemBlock* CustomAllocator::getMemBlockFromMemPool(size_t size) {
    size_t blockSize = size + BLOCK_HEADER_SIZE + BLOCK_FOOTER_SIZE;

    // Check if we need a new memory pool
    if (nowMemPool == NULL || (nowMemPool->curPos + blockSize > nowMemPool->size)) {
        if (!allocMemPool(size)) {
            return NULL;
        }
    }

    unsigned char* start = nowMemPool->payload + nowMemPool->curPos;
    size_t capacity = (nowMemPool->size - nowMemPool->curPos) / blockSize;

    MemBlock* firstBlock = NULL;

    for (size_t i = 0; i < capacity; ++i) {
        MemBlock* currentBlock = reinterpret_cast<MemBlock*>(start + i * blockSize);

        // Initialize the memory block
        currentBlock->size = size;
        currentBlock->signature1 = SDDS_MEMORY_MANAGER_MAGIC_NUMBER1;
        currentBlock->signature2 = SDDS_MEMORY_MANAGER_MAGIC_NUMBER2;
        currentBlock->next = firstBlock;
        firstBlock = currentBlock;
    }

    nowMemPool->curPos += static_cast<int>(blockSize * capacity);

    return firstBlock;
}

/*
MemBlock* CustomAllocator::getMemBlockFromMemPool(size_t size) {
    size_t blockSize = size + BLOCK_HEADER_SIZE + BLOCK_FOOTER_SIZE;

    // 현재 메모리 풀이 부족할 경우 새 메모리 풀 할당
    if (nowMemPool == NULL || (nowMemPool->curPos + blockSize > nowMemPool->size)) {
        if (!allocMemPool(size)) {
            return NULL;
        }
    }

    MemBlock* firstBlock = NULL;
    MemBlock* currentBlock = NULL;

    unsigned char* start = nowMemPool->payload + nowMemPool->curPos;
    size_t capacity = (nowMemPool->size - nowMemPool->curPos) / blockSize;

    for (size_t i = 0; i < capacity; ++i) {
        currentBlock = (MemBlock*)(start + i * blockSize);

        // 메모리 풀의 끝을 초과하지 않도록 확인
        if (reinterpret_cast<size_t>(currentBlock) + blockSize > reinterpret_cast<size_t>(nowMemPool->payload) + nowMemPool->size) {
            if (!allocMemPool(size)) {
                return NULL;
            }

            start = nowMemPool->payload + nowMemPool->curPos;
            i = -1;  // 루프를 재시작하도록 설정
            firstBlock = NULL;  // 기존 블록 목록 초기화
            capacity = (nowMemPool->size - nowMemPool->curPos) / blockSize;  // 새로운 capacity 재계산
            continue;
        }

        currentBlock->size = size;
        currentBlock->signature1 = SDDS_MEMORY_MANAGER_MAGIC_NUMBER1;
        currentBlock->signature2 = SDDS_MEMORY_MANAGER_MAGIC_NUMBER2;
        currentBlock->next = firstBlock;
        firstBlock = currentBlock;
    }

    nowMemPool->curPos += (int)(blockSize * capacity);

    return firstBlock;
}
*/
