#include <iostream>
#include <vector>
#include <map>
#include <cstdlib> // std::malloc, std::free
#include <cassert>

class SlabAllocator {
public:
    SlabAllocator() {
        // 초기화 - 각 2의 제곱 크기별로 SlabCache 생성
        for (size_t i = 0; i <= kMaxPowerOfTwo; ++i) {
            size_t objectSize = 1 << i;
            slabCaches_[objectSize] = SlabCache{objectSize, nullptr};
        }
    }

    ~SlabAllocator() {
        // 할당된 모든 슬랩 메모리 해제
        for (std::map<size_t, SlabCache>::iterator it = slabCaches_.begin(); it != slabCaches_.end(); ++it) {
            SlabCache& cache = it->second;
            for (size_t i = 0; i < cache.slabs.size(); ++i) {
                std::free(cache.slabs[i]);
            }
        }
    }

    void* allocate(size_t size) {
        size_t alignedSize = alignSize(size);
        if (alignedSize > (1 << kMaxPowerOfTwo)) {
            return NULL; // 요청한 크기가 너무 큰 경우 NULL 반환
        }

        SlabCache& cache = slabCaches_[alignedSize];
        if (cache.freeList) {
            Slab* slab = cache.freeList;
            cache.freeList = slab->next;
            return slab;
        }

        void* newSlab = std::malloc(alignedSize);
        if (!newSlab) {
            return NULL; // 메모리 할당 실패 시 NULL 반환
        }

        cache.slabs.push_back(newSlab);
        return newSlab;
    }

    void free(void* ptr, size_t size) {
        size_t alignedSize = alignSize(size);
        SlabCache& cache = slabCaches_[alignedSize];

        Slab* slab = static_cast<Slab*>(ptr);
        slab->next = cache.freeList;
        cache.freeList = slab;
    }

    static SlabAllocator* Instance() {
        static SlabAllocator instance;
        return &instance;
    }

private:
    struct Slab {
        Slab* next;
    };

    struct SlabCache {
        size_t objectSize;
        Slab* freeList;
        std::vector<void*> slabs;

        SlabCache(size_t objSize, Slab* freeListPtr)
            : objectSize(objSize), freeList(freeListPtr) {}
    };

    size_t alignSize(size_t size) const {
        size_t alignedSize = 1;
        while (alignedSize < size) {
            alignedSize <<= 1;
        }
        return alignedSize;
    }

    static const size_t kMaxPowerOfTwo = 20; // 최대 1MB까지 지원 (2^20)

    std::map<size_t, SlabCache> slabCaches_; // VS2008에서는 std::unordered_map 대신 std::map 사용
};

// 사용 예시
int main() {
    SlabAllocator* allocator = SlabAllocator::Instance();

    // 100 바이트 메모리 할당
    void* ptr = allocator->allocate(100);
    std::cout << "Allocated 100 bytes at: " << ptr << std::endl;

    // 할당 해제
    allocator->free(ptr, 100);

    return 0;
}
