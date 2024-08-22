#define SDDS_MEMORY_MANAGER_MAGIC_NUMBER1  0xAA435453L
#define SDDS_MEMORY_MANAGER_MAGIC_NUMBER2  0xBB21474DL

class Lock;
class Mutex;

typedef struct _MemBlock
{	
	size_t signature1;
	size_t signature2;
	size_t size;
	struct _MemBlock *prev;
	struct _MemBlock *next;
	unsigned char* payload;
} MemBlock;

typedef struct _MemPool
{
	unsigned char* payload;
	int curPos;
} MemPool;

typedef struct _FreeBlockEntry
{
	size_t size;
	MemBlock *head;
} FreeBlockEntry;

const int MEM_POOL_SIZE = (20 * (1 << 20)); //20 MB
const int MIN_BLOCK_SIZE = 8;
const int MAX_BLOCK_SIZE = 4096;
const int BLOCK_ENTRY_SIZE = MAX_BLOCK_SIZE / MIN_BLOCK_SIZE;
const int BLOCK_HEADER_SIZE = sizeof(struct _MemBlock) - sizeof(unsigned char*);
const int BLOCK_FOOTER_SIZE = 0;
const int MEM_MANAGER_SIZE = 2;

class CustomAllocator
{
public:
    CustomAllocator();
    ~CustomAllocator();
    void* allocate(size_t);
    void free(void*, size_t);

    static CustomAllocator* Instance(int num = 0);

private:
    static CustomAllocator* instance[MEM_MANAGER_SIZE];

    bool allocMemPool();
    bool freeMemPool();
    MemBlock* getMemBlockFromMemPool(int size);

    MemPool* nowMemPool;
    std::vector<MemPool*> memPoolList;

    FreeBlockEntry freeBlockEntryList[BLOCK_ENTRY_SIZE];
    unsigned int freeBlockEntryListSize[BLOCK_ENTRY_SIZE];
    Mutex* mutex;

    void removeFreeBlock(MemBlock* memBlock, int index);
    void addFreeBlock(MemBlock* memBlock, int index);
};

CustomAllocator* CustomAllocator::instance[MEM_MANAGER_SIZE];

CustomAllocator::CustomAllocator()
{
    allocMemPool();
    for(int i = 0; i < BLOCK_ENTRY_SIZE; i++)
    {
        freeBlockEntryList[i].size = 0x8 << i;
        freeBlockEntryList[i].head = 0; // nullptr 대신 0 사용
        freeBlockEntryListSize[i] = 0;
    }
    mutex = new Mutex;
}

CustomAllocator::~CustomAllocator()
{
    freeMemPool();
    delete mutex;
}

CustomAllocator* CustomAllocator::Instance(int num)
{
    if (!instance[num]) 
        instance[num] = new CustomAllocator();
    return instance[num];
}

void* CustomAllocator::allocate(size_t size)
{
    int index = -1;
    int newSize = 0;
    MemBlock* memBlock;

    for(int i = 0; i < BLOCK_ENTRY_SIZE; i++)
    {
        if(size <= freeBlockEntryList[i].size)
        {
            index = i;
            newSize = freeBlockEntryList[i].size;
            break;
        }
    }
    if(index == -1)
        return 0; // nullptr 대신 0 사용

    mutex->lock();

    memBlock = freeBlockEntryList[index].head;
    if(!memBlock)
    {
        memBlock = getMemBlockFromMemPool(newSize);
    }
    else
    {
        removeFreeBlock(memBlock, index);
    }

    mutex->unlock();

    return (void*)&(memBlock->payload);
}

void CustomAllocator::free(void* object, size_t size)
{
    MemBlock* memBlock = (MemBlock*)((char*)object - BLOCK_HEADER_SIZE);
    int index = -1;

    if(memBlock->signature1 != SDDS_MEMORY_MANAGER_MAGIC_NUMBER1 || 
       memBlock->signature2 != SDDS_MEMORY_MANAGER_MAGIC_NUMBER2)
    {
        if(size == 1)
            delete (char *)object;
        else
            delete[] (char *)object;
        return;
    }

    for(int i = 0; i < BLOCK_ENTRY_SIZE; i++)
    {
        if(memBlock->size <= freeBlockEntryList[i].size)
        {
            index = i;
            break;
        }
    }

    mutex->lock();
    addFreeBlock(memBlock, index);
    mutex->unlock();
}

void CustomAllocator::removeFreeBlock(MemBlock* memBlock, int index)
{
    if(memBlock->prev)
        memBlock->prev->next = memBlock->next;
    if(memBlock->next)
        memBlock->next->prev = memBlock->prev;
    if(freeBlockEntryList[index].head == memBlock)
        freeBlockEntryList[index].head = memBlock->next;

    memBlock->prev = 0; // nullptr 대신 0 사용
    memBlock->next = 0; // nullptr 대신 0 사용
    freeBlockEntryListSize[index]--;
}

void CustomAllocator::addFreeBlock(MemBlock* memBlock, int index)
{
    memBlock->next = freeBlockEntryList[index].head;
    if(memBlock->next)
        memBlock->next->prev = memBlock;
    freeBlockEntryList[index].head = memBlock;
    freeBlockEntryListSize[index]++;
}

bool CustomAllocator::allocMemPool()
{
    nowMemPool = new MemPool;

    try {
        nowMemPool->payload = new unsigned char[MEM_POOL_SIZE];
    }
    catch(std::bad_alloc& ex) {
        printf("CustomAllocator::allocMemPool() Stack OverFlow!! - %s\n", ex.what());
        return false;
    }
    
    nowMemPool->curPos = 0;
    memPoolList.push_back(nowMemPool);
    return true;
}

bool CustomAllocator::freeMemPool()
{
    for(int i = 0; i < (int)memPoolList.size(); i++) // 범위 기반 for 루프 대신 인덱스 기반 루프 사용
    {
        MemPool* memPool = memPoolList[i];
        delete[] memPool->payload;
        delete memPool;
    }
    memPoolList.clear();
    nowMemPool = 0; // nullptr 대신 0 사용

    return true;
}

MemBlock* CustomAllocator::getMemBlockFromMemPool(int size)
{
    if((size + BLOCK_HEADER_SIZE + BLOCK_FOOTER_SIZE) > (MEM_POOL_SIZE - nowMemPool->curPos))
        allocMemPool();

    MemBlock* memBlock = (MemBlock*)(nowMemPool->payload + nowMemPool->curPos);
    nowMemPool->curPos += (size + BLOCK_HEADER_SIZE + BLOCK_FOOTER_SIZE);
    memBlock->size = size;
    memBlock->prev = 0; // nullptr 대신 0 사용
    memBlock->next = 0; // nullptr 대신 0 사용
    memBlock->signature1 = SDDS_MEMORY_MANAGER_MAGIC_NUMBER1;
    memBlock->signature2 = SDDS_MEMORY_MANAGER_MAGIC_NUMBER2;

    return memBlock;
}
