#include <cmath>  // For std::log2 or std::log

// Calculate the number of entries in free block list based on MIN_BLOCK_SIZE and MAX_BLOCK_SIZE
int calculateFreeBlockEntrySize(int minBlockSize, int maxBlockSize) {
    int size = maxBlockSize;
    int count = 0;
    while (size > minBlockSize) {
        size >>= 1;  // Divide size by 2 (equivalent to shifting right by 1)
        count++;
    }
    return count + 1;  // +1 to include the entry for MIN_BLOCK_SIZE
}

// Usage example
const int MIN_BLOCK_SIZE = 8;
const int MAX_BLOCK_SIZE = 4096;
const int FREE_BLOCK_ENTRY_SIZE = calculateFreeBlockEntrySize(MIN_BLOCK_SIZE, MAX_BLOCK_SIZE);
