#include <iostream>
#include <map>
#include <vector>
#include <cstdlib>
#include <cassert>

class SlabAllocator {
public:
    // Singleton 인스턴스를 반환하는 함수
    static SlabAllocator* Instance() {
        static SlabAllocator instance;
        return &instance;
    }

    void* allocate(size_t size) {
        if (slabCaches.find(size) == slabCaches.end()) {
            slabCaches[size] = new SlabCache(size);
            addSlab(size);
        }
    
        SlabCache* cache = slabCaches[size];
        if (cache->freeList == nullptr) {
            addSlab(size);
        }
    
        Slab* slab = cache->freeList;
        cache->freeList = slab->next;
    
        return static_cast<void*>(static_cast<char*>(static_cast<void*>(slab)) + sizeof(Slab));
    }

    void free(void* ptr) {
        Slab* slab = reinterpret_cast<Slab*>(static_cast<char*>(ptr) - sizeof(Slab));
        SlabCache* cache = slab->cache;
        
        slab->next = cache->freeList;
        cache->freeList = slab;
    }

    void free(void* ptr) {
        // ptr을 올바르게 offset 계산하여 slab 구조체의 포인터로 변환
        Slab* slab = reinterpret_cast<Slab*>(static_cast<char*>(ptr) - sizeof(Slab));
        size_t size = slab->cache->objectSize;
    
        slab->next = slabCaches[size]->freeList;
        slabCaches[size]->freeList = slab;
    }

private:
    struct SlabCache;  // 전방 선언

    struct Slab {
        Slab* next;         // 다음 슬랩을 가리키는 포인터
        SlabCache* cache;   // 이 슬랩이 속한 슬랩 캐시
    };

    struct SlabCache {
        size_t objectSize;         // 객체 크기
        Slab* freeList;            // 여유 슬랩 리스트
        std::vector<void*> slabs;  // 할당된 슬랩 메모리 블록

        SlabCache(size_t size) : objectSize(size), freeList(NULL) {}
    };

    std::map<size_t, SlabCache*> slabCaches;  // 객체 크기별 슬랩 캐시 관리

    SlabAllocator() {}

    ~SlabAllocator() {
        for (std::map<size_t, SlabCache*>::iterator it = slabCaches.begin(); it != slabCaches.end(); ++it) {
            SlabCache* cache = it->second;
            for (size_t i = 0; i < cache->slabs.size(); ++i) {
                std::free(cache->slabs[i]);
            }
            delete cache;
        }
        slabCaches.clear();
    }

    void addSlab(size_t size) {
        size_t slabSize = sizeof(Slab) > size ? sizeof(Slab) : size;
        void* memory = std::malloc(slabSize * 1024); // 1024개의 슬랩을 할당

        SlabCache* cache = slabCaches[size];
        cache->slabs.push_back(memory);

        char* current = static_cast<char*>(memory);
        for (size_t i = 0; i < 1024; ++i) {
            Slab* slab = reinterpret_cast<Slab*>(current);
            slab->cache = cache; // 슬랩이 속한 캐시를 지정
            slab->next = cache->freeList;
            cache->freeList = slab;
            current += slabSize;
        }
    }
};
