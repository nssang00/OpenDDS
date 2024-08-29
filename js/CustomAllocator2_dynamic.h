bool CustomAllocator::allocMemPool(size_t blockSize) {
    // 메모리 풀의 크기를 64KB로 설정
    size_t poolSize = 64 * 1024;  // 64KB
    size_t totalBlockSize = blockSize + BLOCK_HEADER_SIZE + BLOCK_FOOTER_SIZE;

    // 64KB로 할당할 수 있는 블록 수를 계산
    size_t blocksPerPool = poolSize / totalBlockSize;

    if (blocksPerPool < 1) {
        blocksPerPool = 1;  // 최소 1개의 블록을 할당하도록 설정
    }

    // 필요한 메모리 크기
    size_t requiredSize = blocksPerPool * totalBlockSize;

    // 메모리 풀을 할당
    nowMemPool = new MemPool;
    try {
        nowMemPool->payload = new unsigned char[requiredSize];
    } catch (std::bad_alloc& ex) {
        printf("CustomAllocator::allocMemPool() Stack OverFlow!! - %s\n", ex.what());
        delete nowMemPool;
        nowMemPool = NULL;
        return false;
    }

    nowMemPool->curPos = 0;
    nowMemPool->size = (int)requiredSize;
    memPoolList.push_back(nowMemPool);
    return true;
}

MemBlock* CustomAllocator::getMemBlockFromMemPool(int size) {
    size_t blockSize = size + BLOCK_HEADER_SIZE + BLOCK_FOOTER_SIZE;

    // 현재 메모리 풀이 부족할 경우 새 메모리 풀 할당
    if (nowMemPool == NULL || (nowMemPool->curPos + blockSize > nowMemPool->size)) {
        if (!allocMemPool(size)) {
            return NULL;
        }
    }

    MemBlock* firstBlock = NULL;
    MemBlock* currentBlock = NULL;

    unsigned char* start = nowMemPool->payload + nowMemPool->curPos;
    size_t blocksPerBatch = (nowMemPool->size - nowMemPool->curPos) / blockSize;

    for (size_t i = 0; i < blocksPerBatch; ++i) {
        currentBlock = (MemBlock*)(start + i * blockSize);

        // 메모리 풀의 끝을 초과하지 않도록 확인
        if (reinterpret_cast<size_t>(currentBlock) + blockSize > reinterpret_cast<size_t>(nowMemPool->payload) + nowMemPool->size) {
            if (!allocMemPool(size)) {
                return NULL;
            }

            start = nowMemPool->payload + nowMemPool->curPos;
            i = -1;  // 루프를 재시작하도록 설정
            firstBlock = NULL;  // 기존 블록 목록 초기화
            blocksPerBatch = (nowMemPool->size - nowMemPool->curPos) / blockSize;
            continue;
        }

        currentBlock->size = size;
        currentBlock->signature1 = SDDS_MEMORY_MANAGER_MAGIC_NUMBER1;
        currentBlock->signature2 = SDDS_MEMORY_MANAGER_MAGIC_NUMBER2;
        currentBlock->next = firstBlock;
        firstBlock = currentBlock;
    }

    nowMemPool->curPos += (int)(blockSize * blocksPerBatch);

    return firstBlock;
}
