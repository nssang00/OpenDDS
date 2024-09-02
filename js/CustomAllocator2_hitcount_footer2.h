#include <vector>
#include <algorithm>

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
    void free(void* object, size_t size); 

    static CustomAllocator* Instance(int num = 0); 

private:
    static const unsigned int HEADER_SIGNATURE = 0x435348ABU;  // 블록 헤더의 시그니처 값
    static const unsigned int FOOTER_SIGNATURE = 0xEF474D4BU;  // 블록 푸터의 시그니처 값

    static const int MEM_POOL_SIZE = 32 * 1024;  // 메모리 풀 크기 (32KB)
    static const int FREE_BLOCK_ENTRY_SIZE = 24; // 자유 블록 항목의 개수

    static const int MIN_BLOCK_SIZE = 8;  // 블록의 최소 크기
    static const int MAX_BLOCK_SIZE = 4096;  // 블록의 최대 크기
    static const int MEM_MANAGER_SIZE = 2;  // 메모리 관리자 배열의 크기
    static const int MAX_BLOCKS_PER_ENTRY = 1024;  // 최대 블록 수
    static const int MIN_BLOCKS_PER_ENTRY = 1;  // 최소 블록 수
    static const int HIT_COUNT_THRESHOLD = 10;  // 블록 확장을 위한 히트 카운트 임계값

    #define ALIGN(size, alignment) (((size) + (alignment - 1)) & ~(alignment - 1))  // 메모리 정렬 매크로
    #define BLOCK_HEADER_SIZE ALIGN(sizeof(MemBlock) - sizeof(unsigned char*), MIN_BLOCK_SIZE)  // 블록 헤더의 크기
    #define BLOCK_FOOTER_SIZE sizeof(unsigned int)  // 블록 푸터의 크기

    // 메모리 블록 구조체
    struct MemBlock {
        unsigned int signature;  // 블록 헤더의 시그니처
        unsigned int size;  // 블록의 크기
        struct MemBlock* next;  // 다음 블록을 가리키는 포인터
        unsigned char* payload;  // 블록의 페이로드
    };

    // 메모리 청크 구조체
    struct MemChunk {
        unsigned char* payload;  // 메모리 청크의 페이로드
    };

    // 자유 블록 항목 구조체
    struct FreeBlockEntry {
        size_t size;  // 블록의 크기
        struct MemBlock* head;  // 자유 블록 리스트의 헤드
        size_t hitCount;  // 블록 사용 히트 카운트
        size_t numBlocks;  // 현재 블록 수
    };

    static CustomAllocator* instance[MEM_MANAGER_SIZE];  // 싱글턴 인스턴스 배열

    std::vector<MemChunk*> memChunkList;  // 메모리 청크 리스트
    FreeBlockEntry freeBlockEntryList[FREE_BLOCK_ENTRY_SIZE];  // 자유 블록 항목 리스트
    Mutex* mutex;  // Mutex 객체

    MemBlock* allocateMemBlocks(size_t size, size_t numBlocks);  // 메모리 블록을 할당하는 함수

    // 주어진 크기에 맞는 자유 블록 리스트의 인덱스를 찾는 함수
    int findFreeListIndex(size_t size) {
        size = ALIGN(size, MIN_BLOCK_SIZE);  // 요청된 크기를 정렬합니다.
        int index = 0;
        size_t block_size = MIN_BLOCK_SIZE;

        while (block_size < size && index < FREE_BLOCK_ENTRY_SIZE - 1) {
            block_size <<= 1;  // 8, 16, 32, 64, 128, 256, ..., 134217728
            index++;
        }
        return index;  // 적절한 인덱스 반환
    }
};

CustomAllocator* CustomAllocator::instance[MEM_MANAGER_SIZE] = { NULL, NULL };

CustomAllocator::CustomAllocator() {
    // 자유 블록 항목 초기화
    for (int i = 0; i < FREE_BLOCK_ENTRY_SIZE; i++) {
        freeBlockEntryList[i].size = MIN_BLOCK_SIZE << i;  // 각 블록 항목의 크기를 설정
        freeBlockEntryList[i].head = NULL;  // 블록 리스트의 헤드를 NULL로 초기화
        freeBlockEntryList[i].hitCount = 0;  // 히트 카운트 초기화
        freeBlockEntryList[i].numBlocks = std::max(MEM_POOL_SIZE / (freeBlockEntryList[i].size + BLOCK_HEADER_SIZE + BLOCK_FOOTER_SIZE), (size_t)MIN_BLOCKS_PER_ENTRY);  // 블록 수 설정
    }
    mutex = new Mutex;  // Mutex 객체 생성
}

CustomAllocator::~CustomAllocator() {
    // 메모리 청크 리스트를 순회하며 메모리 해제
    for (std::vector<MemChunk*>::iterator it = memChunkList.begin(); it != memChunkList.end(); ++it) {
        MemChunk* memChunk = *it;
        delete[] memChunk->payload;  // 메모리 청크의 페이로드 삭제
        delete memChunk;  // 메모리 청크 객체 삭제
    }
    memChunkList.clear();  // 메모리 청크 리스트 비우기
    delete mutex;  // Mutex 객체 삭제
}

CustomAllocator* CustomAllocator::Instance(int num) {
    if (!instance[num])
        instance[num] = new CustomAllocator();  // 인스턴스가 없으면 새로 생성
    return instance[num];  // 인스턴스 반환
}

// 메모리 할당 함수
void* CustomAllocator::allocate(size_t size) {
    int index = findFreeListIndex(size);  // 요청된 크기에 맞는 인덱스 찾기
    size_t newSize = freeBlockEntryList[index].size;  // 할당할 블록의 크기

    mutex->lock();  // Mutex 잠금

    MemBlock* memBlock = freeBlockEntryList[index].head;

    if (!memBlock) {// 자유 블록이 없으면 새 메모리 블록을 할당합니다.
        freeBlockEntryList[index].hitCount++;

        // 블록 사용 횟수가 임계값을 초과하고 블록 수가 최대 블록 수보다 작으면 블록 수를 확장
        if (freeBlockEntryList[index].hitCount >= HIT_COUNT_THRESHOLD && freeBlockEntryList[index].numBlocks < MAX_BLOCKS_PER_ENTRY) {
            freeBlockEntryList[index].numBlocks = std::min(freeBlockEntryList[index].numBlocks * 2, MAX_BLOCKS_PER_ENTRY);
            freeBlockEntryList[index].hitCount = 0;
        }

        memBlock = allocateMemBlocks(newSize, freeBlockEntryList[index].numBlocks);  // 새 메모리 블록 할당
    }

    if (memBlock) {
        freeBlockEntryList[index].head = memBlock->next;  // 자유 블록 리스트에서 블록을 제거
    }

    mutex->unlock();  // Mutex 잠금 해제

    return memBlock ? (void*)&(memBlock->payload) : NULL;  // 메모리 블록의 페이로드 반환
}

// 메모리 해제 함수
void CustomAllocator::free(void* object, size_t size) {
    // 객체를 메모리 블록으로 변환
    MemBlock* memBlock = reinterpret_cast<MemBlock*>(reinterpret_cast<unsigned char*>(object) - BLOCK_HEADER_SIZE);
    unsigned int* footer = reinterpret_cast<unsigned int*>(reinterpret_cast<unsigned char*>(object) + memBlock->size);

    // 시그니처가 일치하지 않으면 일반 delete[]로 처리합니다.
    if (memBlock->signature != HEADER_SIGNATURE || *footer != FOOTER_SIGNATURE) {
        delete[] reinterpret_cast<unsigned char*>(object);  // 잘못된 블록 처리
        return;
    }

    int index = findFreeListIndex(memBlock->size);  // 블록 크기에 맞는 인덱스 찾기

    mutex->lock();  // Mutex 잠금
    memBlock->next = freeBlockEntryList[index].head;  // 자유 블록 리스트의 헤드에 블록 추가
    freeBlockEntryList[index].head = memBlock;    // 자유 블록 리스트의 헤드에 블록 추가
    mutex->unlock();  // Mutex 잠금 해제
}

// 메모리 블록을 할당하는 함수
CustomAllocator::MemBlock* CustomAllocator::allocateMemBlocks(size_t size, size_t numBlocks) {
    // 블록 크기 계산 (헤더와 푸터를 포함)
    size_t blockSize = ALIGN(size + BLOCK_HEADER_SIZE, MIN_BLOCK_SIZE) + BLOCK_FOOTER_SIZE;

    MemChunk* currentMemChunk = NULL;

    try {
        currentMemChunk = new MemChunk;// 새로운 메모리 청크 할당
        currentMemChunk->payload = new unsigned char[numBlocks * blockSize];  // 요청된 수의 블록을 담을 메모리 할당
    } catch (std::bad_alloc& ex) {
        printf("CustomAllocator::allocateMemBlocks() Stack Overflow!! - %s\n", ex.what());// 메모리 할당 실패 시 예외 처리
        delete currentMemChunk;  // 할당된 메모리 청크 삭제
        return NULL;  // NULL 반환
    }

    memChunkList.push_back(currentMemChunk);  // 메모리 청크 리스트에 추가

    MemBlock* firstBlock = reinterpret_cast<MemBlock*>(currentMemChunk->payload);
    MemBlock* currentBlock = firstBlock;

    for (size_t i = 0; i < numBlocks; ++i) {
        currentBlock->size = static_cast<unsigned int>(size);  // 요청된 크기 저장
        currentBlock->signature = HEADER_SIGNATURE;  // 헤더 시그니처 설정

        // 블록 푸터에 시그니처 저장
        unsigned int* footer = reinterpret_cast<unsigned int*>(reinterpret_cast<unsigned char*>(currentBlock) + blockSize - BLOCK_FOOTER_SIZE);
        *footer = FOOTER_SIGNATURE;

        // 다음 블록을 설정
        if (i < numBlocks - 1) {
            currentBlock->next = reinterpret_cast<MemBlock*>(reinterpret_cast<unsigned char*>(currentBlock) + blockSize);
            currentBlock = currentBlock->next;
        } else {
            currentBlock->next = NULL;  // 마지막 블록의 경우 next는 NULL
        }
    }
    return firstBlock;  // 첫 번째 블록의 포인터 반환
}
