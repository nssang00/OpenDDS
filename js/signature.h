#include <stdexcept>
#include <cstdlib>
#include <cstddef>

class ComplexSignatureMemoryManager {
private:
    static const unsigned long HEADER_SIGNATURE = 0xDEADBEEF;
    static const unsigned long FOOTER_SIGNATURE = 0xFEEDFACE;

    struct MemoryBlockHeader {
        unsigned long signature;
        size_t size;
    };

    struct MemoryBlockFooter {
        unsigned long signature;
    };

public:
    void* allocate(size_t size) {
        size_t totalSize = size + sizeof(MemoryBlockHeader) + sizeof(MemoryBlockFooter);
        void* rawMemory = malloc(totalSize);  // 실제 할당 로직으로 대체
        
        if (rawMemory == NULL) {
            throw std::bad_alloc();
        }
        
        MemoryBlockHeader* header = static_cast<MemoryBlockHeader*>(rawMemory);
        header->signature = HEADER_SIGNATURE;
        header->size = size;
        
        MemoryBlockFooter* footer = reinterpret_cast<MemoryBlockFooter*>(
            static_cast<char*>(rawMemory) + sizeof(MemoryBlockHeader) + size
        );
        footer->signature = FOOTER_SIGNATURE;
        
        return static_cast<char*>(rawMemory) + sizeof(MemoryBlockHeader);
    }

    void deallocate(void* ptr) {
        if (!ptr) return;
        
        MemoryBlockHeader* header = reinterpret_cast<MemoryBlockHeader*>(
            static_cast<char*>(ptr) - sizeof(MemoryBlockHeader)
        );
        
        if (header->signature != HEADER_SIGNATURE) {
            throw std::runtime_error("Invalid memory block header");
        }
        
        MemoryBlockFooter* footer = reinterpret_cast<MemoryBlockFooter*>(
            static_cast<char*>(ptr) + header->size
        );
        
        if (footer->signature != FOOTER_SIGNATURE) {
            throw std::runtime_error("Memory overrun detected");
        }
        
        free(header);  // 실제 해제 로직으로 대체
    }
};
