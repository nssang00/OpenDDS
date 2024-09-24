#include <cstddef>
#include <vector>
#include <map>
#include <cstdlib>
#include <cassert>
#include <iostream>

class SlabAllocator {
public:
    // Singleton 인스턴스를 반환하는 함수
    static SlabAllocator* Instance();

    void* allocate(size_t size);
    void free(void* ptr);

private:
    struct Slab {
        Slab* next;  // 다음 슬랩을 가리키는 포인터
    };

    struct SlabCache {
        size_t objectSize;    // 객체 크기
        Slab* freeList;       // 여유 슬랩 리스트
        std::vector<void*> slabs;  // 할당된 슬랩 메모리 블록
    };

    std::map<size_t, SlabCache*> slabCaches;  // 객체 크기별 슬랩 캐시 관리

    // 생성자 및 소멸자는 private으로 접근 제한
    SlabAllocator();
    ~SlabAllocator();

    // 슬랩 캐시에 새 슬랩을 추가
    void addSlab(size_t size);

    // 포인터에서 객체 크기를 가져오는 함수
    size_t getObjectSize(void* ptr);
};

// Singleton 인스턴스 반환
SlabAllocator* SlabAllocator::Instance() {
    static SlabAllocator instance;
    return &instance;
}

// SlabAllocator 생성자
SlabAllocator::SlabAllocator() {}

// SlabAllocator 소멸자
SlabAllocator::~SlabAllocator() {
    for (std::map<size_t, SlabCache*>::iterator it = slabCaches.begin(); it != slabCaches.end(); ++it) {
        SlabCache* cache = it->second;
        for (std::vector<void*>::iterator vecIt = cache->slabs.begin(); vecIt != cache->slabs.end(); ++vecIt) {
            ::free(*vecIt);  // 각 슬랩 메모리 블록 해제
        }
        delete cache;  // SlabCache 해제
    }
}

// 새 슬랩을 추가하는 함수
void SlabAllocator::addSlab(size_t size) {
    SlabCache* cache;

    std::map<size_t, SlabCache*>::iterator it = slabCaches.find(size);
    if (it == slabCaches.end()) {
        // 새로운 SlabCache 생성
        cache = new SlabCache();
        cache->objectSize = size;
        cache->freeList = NULL;
        slabCaches[size] = cache;
    } else {
        cache = it->second;
    }

    // 새로운 슬랩 메모리 블록 할당
    size_t slabSize = (size + sizeof(Slab)) * 8;  // 슬랩 크기 계산
    void* newSlab = ::malloc(slabSize);  // 메모리 할당
    if (!newSlab) {
        std::cerr << "Memory allocation failed!" << std::endl;
        return;
    }
    cache->slabs.push_back(newSlab);  // 슬랩 리스트에 추가

    char* slabPtr = static_cast<char*>(newSlab);

    for (int i = 0; i < 8; ++i) {
        Slab* slab = reinterpret_cast<Slab*>(slabPtr);
        slab->next = cache->freeList;
        cache->freeList = slab;
        slabPtr += size + sizeof(Slab);  // 다음 슬랩으로 이동
    }
}

// 메모리를 할당하는 함수
void* SlabAllocator::allocate(size_t size) {
    SlabCache* cache;

    std::map<size_t, SlabCache*>::iterator it = slabCaches.find(size);
    if (it == slabCaches.end()) {
        addSlab(size);
        it = slabCaches.find(size);
    }

    cache = it->second;
    if (!cache->freeList) {
        addSlab(size);
    }

    Slab* slab = cache->freeList;
    cache->freeList = slab->next;

    return reinterpret_cast<void*>(reinterpret_cast<char*>(slab) + sizeof(Slab));
}

// 메모리를 해제하는 함수
void SlabAllocator::free(void* ptr) {
    size_t size = getObjectSize(ptr);
    SlabCache* cache = slabCaches[size];

    char* actualPtr = reinterpret_cast<char*>(ptr) - sizeof(Slab);
    Slab* slab = reinterpret_cast<Slab*>(actualPtr);
    slab->next = cache->freeList;
    cache->freeList = slab;
}

// 객체 크기를 가져오는 함수
size_t SlabAllocator::getObjectSize(void* ptr) {
    char* actualPtr = reinterpret_cast<char*>(ptr) - sizeof(Slab);
    Slab* slab = reinterpret_cast<Slab*>(actualPtr);
    size_t offset = sizeof(Slab) - sizeof(size_t);
    return *(reinterpret_cast<size_t*>(reinterpret_cast<char*>(slab) + offset));
}

// 사용 예시
int main() {
    SlabAllocator* allocator = SlabAllocator::Instance();

    // 64 바이트 블록 할당
    void* ptr1 = allocator->allocate(64);
    std::cout << "Allocated block at: " << ptr1 << std::endl;

    // 할당된 블록 해제
    allocator->free(ptr1);
    std::cout << "Freed block at: " << ptr1 << std::endl;

    return 0;
}
