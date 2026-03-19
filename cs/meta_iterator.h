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
