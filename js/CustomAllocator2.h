#define SDDS_MEMORY_MANAGER_MAGIC_NUMBER1       0xAA435453L
#define SDDS_MEMORY_MANAGER_MAGIC_NUMBER2       0xBB21474DL

#define BLOCK_BATCH_SIZE 1024  // �� ���� �Ҵ��� ����� ����

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
        freeBlockEntryList[i].head = NULL;  // VS2008������ nullptr ��� NULL ���
        freeBlockEntryListSize[i] = 0;
    }
    mutex = new Mutex;
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
        return NULL;  // VS2008������ nullptr ��� NULL ���

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

bool CustomAllocator::allocMemPool(int size) {
    nowMemPool = new MemPool;

    size_t blockSize = size + BLOCK_HEADER_SIZE + BLOCK_FOOTER_SIZE;
    size_t requiredSize = blockSize * BLOCK_BATCH_SIZE;

    try {
        nowMemPool->payload = new unsigned char[requiredSize];
    }
    catch (std::bad_alloc& ex) {
        printf("CustomAllocator::allocMemPool() Stack OverFlow!! - %s\n", ex.what());
        delete nowMemPool;
        nowMemPool = NULL;  // VS2008������ nullptr ��� NULL ���
        return false;
    }

    nowMemPool->curPos = 0;
    nowMemPool->size = (int)requiredSize;  // VS2008������ size_t���� int���� ����� ĳ���� �ʿ�
    memPoolList.push_back(nowMemPool);
    return true;
}

bool CustomAllocator::freeMemPool() {
    for (size_t i = 0; i < memPoolList.size(); i++) {  // C++03���� ȣȯ�ǵ��� ����
        MemPool* memPool = memPoolList[i];
        delete[] memPool->payload;
        delete memPool;
    }
    memPoolList.clear();
    nowMemPool = NULL;  // VS2008������ nullptr ��� NULL ���

    return true;
}

MemBlock* CustomAllocator::getMemBlockFromMemPool(int size) {
    size_t blockSize = size + BLOCK_HEADER_SIZE + BLOCK_FOOTER_SIZE;

    // ���� �޸� Ǯ�� ������ ��� �� �޸� Ǯ �Ҵ�
    if (nowMemPool == NULL || (nowMemPool->curPos + blockSize * BLOCK_BATCH_SIZE > nowMemPool->size)) {
        if (!allocMemPool(size)) {
            return NULL;  // VS2008������ nullptr ��� NULL ���
        }
    }

    MemBlock* firstBlock = NULL;  // VS2008������ nullptr ��� NULL ���
    MemBlock* currentBlock = NULL;  // VS2008������ nullptr ��� NULL ���

    unsigned char* start = nowMemPool->payload + nowMemPool->curPos;

    for (int i = 0; i < BLOCK_BATCH_SIZE; ++i) {
        currentBlock = (MemBlock*)(start + i * blockSize);

        // �޸� Ǯ�� ���� �ʰ����� �ʵ��� Ȯ��
        if (reinterpret_cast<size_t>(currentBlock) + blockSize > reinterpret_cast<size_t>(nowMemPool->payload) + nowMemPool->size) {
            // ����� Ǯ�� ���� �ʰ��ϸ� �׼��� ������ �߻��ϹǷ�, ���ο� Ǯ�� �Ҵ��մϴ�.
            if (!allocMemPool(size)) {
                return NULL;
            }

            start = nowMemPool->payload + nowMemPool->curPos;
            i = -1;  // ������ ������ϵ��� ����
            firstBlock = NULL;  // ���� ��� ��� �ʱ�ȭ
            continue;
        }

        currentBlock->size = size;
        currentBlock->signature1 = SDDS_MEMORY_MANAGER_MAGIC_NUMBER1;
        currentBlock->signature2 = SDDS_MEMORY_MANAGER_MAGIC_NUMBER2;
        currentBlock->next = firstBlock;
        firstBlock = currentBlock;
    }

    nowMemPool->curPos += (int)(blockSize * BLOCK_BATCH_SIZE);  // VS2008������ ĳ���� �ʿ�

    // ù ��° ����� ��ȯ
    return firstBlock;
}
