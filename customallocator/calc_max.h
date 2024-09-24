#include <cmath>  // For basic math functions

// Calculate the number of free block entries based on MIN_BLOCK_SIZE and MAX_BLOCK_SIZE
int calculateFreeBlockEntrySize(int minBlockSize, int maxBlockSize) {
    int size = maxBlockSize;
    int count = 0;
    while (size > minBlockSize) {
        size >>= 1;  // Divide size by 2 (equivalent to shifting right by 1)
        count++;
    }
    return count + 1;  // +1 to include the entry for MIN_BLOCK_SIZE
}

static const int MIN_BLOCK_SIZE = 8;  // Minimum block size
static const int MAX_BLOCK_SIZE = 4096;  // Maximum block size

// CustomAllocator.h
#include <cmath>  // For std::log2

class CustomAllocator {
public:
    static const int MIN_BLOCK_SIZE;
    static const int MAX_BLOCK_SIZE;
    static const int FREE_BLOCK_ENTRY_SIZE;

private:
    static int calculateFreeBlockEntrySize(int minBlockSize, int maxBlockSize);
};

// CustomAllocator.cpp
#include "CustomAllocator.h"

const int CustomAllocator::MIN_BLOCK_SIZE = 8;
const int CustomAllocator::MAX_BLOCK_SIZE = 4096;

// Function to calculate the number of free block entries based on MIN_BLOCK_SIZE and MAX_BLOCK_SIZE
int CustomAllocator::calculateFreeBlockEntrySize(int minBlockSize, int maxBlockSize) {
    int size = maxBlockSize;
    int count = 0;
    while (size > minBlockSize) {
        size >>= 1;  // Divide size by 2 (equivalent to shifting right by 1)
        count++;
    }
    return count + 1;  // +1 to include the entry for MIN_BLOCK_SIZE
}

const int CustomAllocator::FREE_BLOCK_ENTRY_SIZE = CustomAllocator::calculateFreeBlockEntrySize(MIN_BLOCK_SIZE, MAX_BLOCK_SIZE);
