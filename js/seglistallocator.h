#include <stddef.h>
#include <stdbool.h>

#define SIGNATURE 0xDEADBEEF
#define NUM_LISTS 10 // 예시로 10개의 리스트를 사용
#define MIN_BLOCK_SIZE 8

typedef struct block_t {
    size_t size;
    bool is_free;              // 블록이 사용 중인지 표시
    struct block_t* next;
} block_t;

block_t* segregated_free_lists[NUM_LISTS]; // 크기별 프리 리스트 배열

// 정렬을 위한 매크로
#define ALIGN(size, alignment) (((size) + (alignment - 1)) & ~(alignment - 1))
#define BLOCK_HEADER_SIZE ALIGN(sizeof(block_t), MIN_BLOCK_SIZE)

int get_list_index(size_t size) {
    int index = 0;
    size_t block_size = MIN_BLOCK_SIZE;

    while (block_size < size && index < NUM_LISTS - 1) {
        block_size <<= 1; // 2배씩 증가
        index++;
    }
    return index;
}

void split_block(block_t* block, size_t size) {
    size_t remaining_size = block->size - size - BLOCK_HEADER_SIZE;

    if (remaining_size >= MIN_BLOCK_SIZE) {
        // 남은 부분을 새로운 블록으로 만들어 프리 리스트에 추가
        block_t* new_block = (block_t*)((char*)block + BLOCK_HEADER_SIZE + size);
        new_block->size = remaining_size;
        new_block->is_free = true;
        add_to_free_list(new_block);
        block->size = size;
    }
}

void* malloc(size_t size) {
    size = ALIGN(size, MIN_BLOCK_SIZE); // 정렬
    size += BLOCK_HEADER_SIZE;          // 헤더 크기 포함

    int index = get_list_index(size);
    
    // 해당 인덱스의 프리 리스트에서 블록 탐색
    block_t* current = segregated_free_lists[index];
    
    while (current != NULL) {
        if (current->is_free && current->size >= size) {
            remove_from_free_list(current, index);
            split_block(current, size);  // 블록 분할
            current->is_free = false;
            return (void*)((char*)current + BLOCK_HEADER_SIZE);
        }
        current = current->next;
    }
    
    // 적절한 블록이 없을 경우, 새로운 블록 할당
    block_t* new_block = allocate_new_block(size);
    if (new_block != NULL) {
        new_block->is_free = false;
        return (void*)((char*)new_block + BLOCK_HEADER_SIZE);
    }
    
    return NULL; // 메모리 할당 실패
}

void free(void* ptr) {
    if (ptr == NULL) {
        return;
    }

    block_t* block = (block_t*)((char*)ptr - BLOCK_HEADER_SIZE);
    block->is_free = true;

    // 인접 블록과 병합 시도
    coalesce_blocks(block);
}

void add_to_free_list(block_t* block) {
    int index = get_list_index(block->size);
    block->next = segregated_free_lists[index];
    segregated_free_lists[index] = block;
}

void remove_from_free_list(block_t* block, int index) {
    block_t** current = &segregated_free_lists[index];
    
    while (*current != NULL) {
        if (*current == block) {
            *current = block->next;
            return;
        }
        current = &(*current)->next;
    }
}

void coalesce_blocks(block_t* block) {
    // 이전 및 다음 블록을 찾고 병합 시도
    block_t* next_block = (block_t*)((char*)block + BLOCK_HEADER_SIZE + block->size);
    if (next_block->is_free) {
        remove_from_free_list(next_block, get_list_index(next_block->size));
        block->size += next_block->size + BLOCK_HEADER_SIZE;
    }

    // 프리 리스트에 병합된 블록을 추가
    add_to_free_list(block);
}

block_t* allocate_new_block(size_t size) {
    // 실제 시스템에서는 시스템 콜을 통해 메모리를 요청
    block_t* new_block = /* 시스템 콜 또는 메모리 풀에서 메모리 할당 */;
    if (new_block != NULL) {
        new_block->size = size;
        new_block->is_free = false;
    }
    return new_block;
}
