## 문제는 변수 위치

`next_commit`이 루프 안에 있으면 매 블록마다 5000으로 리셋됩니다.

```cpp
// ❌ 루프 안 → 매번 리셋
while ((block = getNextMetaTileBlock(blockStartIndex)) != NULL) {
  int next_commit = 5000;  // 매 블록마다 5000으로 리셋
  if (count >= next_commit) commit();  // 거의 매번 커밋
}

// ✅ 루프 밖
int next_commit = 5000;
while ((block = getNextMetaTileBlock(blockStartIndex)) != NULL) {
  // ... 처리 ...
  int completed = gDispatchedTileCount.fetch_add(...);
  
  if (completed >= next_commit) {
    serializer.commit();
    next_commit += 5000;
  }
}
serializer.commit();  // 잔여분
```

멀티스레드면 `next_commit`도 atomic이어야 하지만, 정확도가 필요없다면 그냥 둬도 됩니다. 최악의 경우 두 스레드가 동시에 commit을 호출하는 정도입니다.


//////////
dispatch 시점에 증가하던 걸 → 완료 시점으로 이동만 하면 됩니다.
// getNextMetaTileBlock 안에서 gDispatchedTileCount 증가 제거
// → 완료 후 증가로 이동

while ((block = getNextMetaTileBlock(blockStartIndex)) != NULL) {
  for (int i = 0; i < (int)block->size(); i++) {
    const ctb::TileCoordinate &coord = (*block)[i];

    if (metadata) metadata->add(tiler.grid(), &coord);

    if (serializer.mustSerializeCoordinate(&coord)) {
      MeshTile *tile = tiler.createTile(coord, &reader);
      serializer.serializeTile(tile, writeVertexNormals);
      delete tile;
    }
  }

  // dispatch 기준 → 완료 기준으로 변경
  showProgress(gDispatchedTileCount.fetch_add((int)block->size()) + (int)block->size() - 1);
}
gDispatchedTileCount가 std::atomic<int>이면 그대로, 아니면:
static std::atomic<int> gDispatchedTileCount{0};  // atomic으로만 변경

//////////
// zoom 고정 임계값 제거 → 실제 타일 수로 계산
static int
getMetaTileDimForZoom(int tilesX, int tilesY, int numThreads) {
  int totalTiles = tilesX * tilesY;
  
  // 스레드당 4개 청크 여유 (work stealing)
  int targetChunks = numThreads * 4;
  int tilesPerChunk = std::max(1, totalTiles / targetChunks);
  
  // 정사각형 청크 기준 dim 계산
  int dim = (int)std::round(std::sqrt((double)tilesPerChunk));
  
  return std::max(1, std::min(8, dim));
}

static void
initMetaTileBlocks(const ctb::Grid &grid, const ctb::CRSBounds &extent,
                   i_zoom startZoom, i_zoom endZoom, int numThreads) {
  gMetaTileBlocks.clear();
  gMetaBlockIndex = 0;
  gDispatchedTileCount = 0;
  iteratorSize = 0;

  for (i_zoom zoom = startZoom; zoom >= endZoom; zoom--) {
    ctb::TileCoordinate ll = grid.crsToTile(extent.getLowerLeft(), zoom);
    ctb::TileCoordinate ur = grid.crsToTile(extent.getUpperRight(), zoom);

    // 실제 extent 내 타일 수 계산
    int tilesX = (int)(ur.x - ll.x + 1);
    int tilesY = (int)(ur.y - ll.y + 1);

    int dim = getMetaTileDimForZoom(tilesX, tilesY, numThreads);  // 동적 계산

    int bx_start = (ll.x / dim) * dim;
    int by_start = (ll.y / dim) * dim;

    for (int bx = bx_start; bx <= (int)ur.x; bx += dim) {
      for (int by = by_start; by <= (int)ur.y; by += dim) {
        std::vector<ctb::TileCoordinate> block;
        block.reserve(dim * dim);

        for (int x = bx; x < bx + dim && x <= (int)ur.x; x++) {
          for (int y = by; y < by + dim && y <= (int)ur.y; y++) {
            if (x >= (int)ll.x && y >= (int)ll.y) {
              block.push_back(ctb::TileCoordinate(zoom, x, y));
            }
          }
        }
        if (!block.empty()) {
          iteratorSize += (int)block.size();
          gMetaTileBlocks.push_back(std::move(block));
        }
      }
    }
  }
}

/////////////////
static int
getMetaTileDimForZoom(i_zoom zoom) {
  if (zoom >= 10) return 8;
  if (zoom >= 7)  return 4;
  if (zoom >= 4)  return 2;
  return 1;
}

static void
initMetaTileBlocks(const ctb::Grid &grid, const ctb::CRSBounds &extent, i_zoom startZoom, i_zoom endZoom) {
  gMetaTileBlocks.clear();
  gMetaBlockIndex = 0;
  gDispatchedTileCount = 0;
  iteratorSize = 0;

  for (i_zoom zoom = startZoom; zoom >= endZoom; zoom--) {
    ctb::TileCoordinate ll = grid.crsToTile(extent.getLowerLeft(), zoom);
    ctb::TileCoordinate ur = grid.crsToTile(extent.getUpperRight(), zoom);

    int dim = getMetaTileDimForZoom(zoom);
    int bx_start = (ll.x / dim) * dim;
    int by_start = (ll.y / dim) * dim;

    for (int bx = bx_start; bx <= (int)ur.x; bx += dim) {
      for (int by = by_start; by <= (int)ur.y; by += dim) {
        std::vector<ctb::TileCoordinate> block;
        block.reserve(dim * dim);

        for (int x = bx; x < bx + dim && x <= (int)ur.x; x++) {
          for (int y = by; y < by + dim && y <= (int)ur.y; y++) {
            if (x >= (int)ll.x && y >= (int)ll.y) {
              block.push_back(ctb::TileCoordinate(zoom, x, y));
            }
          }
        }
        if (!block.empty()) {
          iteratorSize += (int)block.size();
          gMetaTileBlocks.push_back(std::move(block));
        }
      }
    }
  }
}

while ((block = getNextMetaTileBlock(blockStartIndex)) != NULL) {
  for (int i = 0; i < (int)block->size(); i++) {
    const ctb::TileCoordinate &coord = (*block)[i];

    if (metadata) metadata->add(tiler.grid(), &coord);

    if (serializer.mustSerializeCoordinate(&coord)) {
      MeshTile *tile = tiler.createTile(coord, &reader);
      serializer.serializeTile(tile, writeVertexNormals);
      delete tile;
    }
  }
  // 타일마다 대신 블록 처리 완료 후 한번만 출력
  showProgress(blockStartIndex + (int)block->size() - 1);
}


///////////////
static int gDispatchedTileCount = 0;

static const std::vector<ctb::TileCoordinate> *
getNextMetaTileBlock(int &startIndex) {
  static std::mutex mutex;
  std::lock_guard<std::mutex> lock(mutex);

  if (gMetaBlockIndex >= (int)gMetaTileBlocks.size())
    return NULL;

  const std::vector<ctb::TileCoordinate> *block = &gMetaTileBlocks[gMetaBlockIndex++];
  startIndex = gDispatchedTileCount;
  gDispatchedTileCount += (int)block->size();

  return block;
}
// buildMeshMetaTile 안에서
int blockStartIndex;
const std::vector<ctb::TileCoordinate> *block;
while ((block = getNextMetaTileBlock(blockStartIndex)) != NULL) {
  for (int i = 0; i < (int)block->size(); i++) {
    const ctb::TileCoordinate &coord = (*block)[i];

    if (metadata) metadata->add(tiler.grid(), &coord);

    if (serializer.mustSerializeCoordinate(&coord)) {
      MeshTile *tile = tiler.createTile(coord, &reader);
      serializer.serializeTile(tile, writeVertexNormals);
      delete tile;
    }

    showProgress(blockStartIndex + i);
  }
}



/////////////////////////

```cpp
static constexpr int META_TILE_DIM = 8;

static std::vector<std::vector<ctb::TileCoordinate>> gMetaTileBlocks;
static int gMetaBlockIndex = 0;
static std::mutex gMetaBlockMutex;

static void
initMetaTileBlocks(const ctb::Grid &grid, const ctb::CRSBounds &extent, i_zoom startZoom, i_zoom endZoom) {
  gMetaTileBlocks.clear();
  gMetaBlockIndex = 0;
  iteratorSize = 0;

  for (i_zoom zoom = startZoom; zoom >= endZoom; zoom--) {
    ctb::TileCoordinate ll = grid.crsToTile(extent.getLowerLeft(), zoom);
    ctb::TileCoordinate ur = grid.crsToTile(extent.getUpperRight(), zoom);

    int bx_start = (ll.x / META_TILE_DIM) * META_TILE_DIM;
    int by_start = (ll.y / META_TILE_DIM) * META_TILE_DIM;

    for (int bx = bx_start; bx <= (int)ur.x; bx += META_TILE_DIM) {
      for (int by = by_start; by <= (int)ur.y; by += META_TILE_DIM) {
        std::vector<ctb::TileCoordinate> block;
        block.reserve(META_TILE_DIM * META_TILE_DIM);

        for (int x = bx; x < bx + META_TILE_DIM && x <= (int)ur.x; x++) {
          for (int y = by; y < by + META_TILE_DIM && y <= (int)ur.y; y++) {
            if (x >= (int)ll.x && y >= (int)ll.y) {
              block.push_back(ctb::TileCoordinate(zoom, x, y));
            }
          }
        }
        if (!block.empty()) {
          iteratorSize += (int)block.size();
          gMetaTileBlocks.push_back(std::move(block));
        }
      }
    }
  }
}

// 다음 블록 반환, 없으면 nullptr
static const std::vector<ctb::TileCoordinate> *
getNextMetaTileBlock() {
  std::lock_guard<std::mutex> lock(gMetaBlockMutex);

  if (gMetaBlockIndex >= (int)gMetaTileBlocks.size())
    return NULL;

  return &gMetaTileBlocks[gMetaBlockIndex++];
}
```

사용은:
```cpp
// main에서 스레드 생성 전
initMetaTileBlocks(tiler.grid(), tiler.bounds(), startZoom, endZoom);

// 각 스레드에서
const std::vector<ctb::TileCoordinate> *block;
while ((block = getNextMetaTileBlock()) != NULL) {
  for (int i = 0; i < (int)block->size(); i++) {
    const ctb::TileCoordinate &coord = (*block)[i];
    // 타일 처리
  }
}
```
