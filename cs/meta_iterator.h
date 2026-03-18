```cpp
// MeshTiler.h
static constexpr size_t HEIGHT_CACHE_MAX_SIZE = 128;

std::vector<std::pair<ctb::TileCoordinate, std::vector<float>>> mHeightCache;
```

```cpp
// ctb-tile.cpp
static constexpr int META_TILE_DIM = 8; // 8x8 블록

static std::vector<std::vector<ctb::TileCoordinate>> gMetaTileBlocks;
static std::atomic<int> gMetaBlockIndex{0};
static std::once_flag gMetaTileInitFlag;

static void
initMetaTileBlocks(const ctb::Grid &grid, const ctb::CRSBounds &extent, i_zoom startZoom, i_zoom endZoom) {
  std::call_once(gMetaTileInitFlag, [&]() {
    gMetaTileBlocks.clear();
    gMetaBlockIndex = 0;
    iteratorSize = 0;

    for (i_zoom zoom = startZoom; zoom >= endZoom; zoom--) {
      ctb::TileCoordinate ll = grid.crsToTile(extent.getLowerLeft(), zoom);
      ctb::TileCoordinate ur = grid.crsToTile(extent.getUpperRight(), zoom);

      // OSM 방식 - 전역 그리드 기준 정렬
      int bx_start = (ll.x / META_TILE_DIM) * META_TILE_DIM;
      int by_start = (ll.y / META_TILE_DIM) * META_TILE_DIM;

      for (int bx = bx_start; bx <= (int)ur.x; bx += META_TILE_DIM) {
        for (int by = by_start; by <= (int)ur.y; by += META_TILE_DIM) {
          std::vector<ctb::TileCoordinate> block;
          block.reserve(META_TILE_DIM * META_TILE_DIM);

          for (int x = bx; x < bx + META_TILE_DIM && x <= (int)ur.x; x++) {
            for (int y = by; y < by + META_TILE_DIM && y <= (int)ur.y; y++) {
              if (x >= (int)ll.x && y >= (int)ll.y) {
                block.emplace_back(zoom, x, y);
              }
            }
          }
          if (!block.empty()) {
            iteratorSize += block.size();
            gMetaTileBlocks.push_back(std::move(block));
          }
        }
      }
    }
  });
}

static void
buildMeshMetaTile(MeshSerializer &serializer, const MeshTiler &tiler, TerrainBuild *command, TerrainMetadata *metadata, bool writeVertexNormals = false) {
  i_zoom startZoom = (command->startZoom < 0) ? tiler.maxZoomLevel() : command->startZoom;
  i_zoom endZoom   = (command->endZoom   < 0) ? 0 : command->endZoom;

  initMetaTileBlocks(tiler.grid(), tiler.bounds(), startZoom, endZoom);

  GDALDatasetReaderWithOverviews reader(tiler);
  int currentIndex = 0;

  int blockIndex;
  while ((blockIndex = gMetaBlockIndex.fetch_add(1)) < (int)gMetaTileBlocks.size()) {
    const auto &block = gMetaTileBlocks[blockIndex];

    for (const ctb::TileCoordinate &coord : block) {
      if (metadata) metadata->add(tiler.grid(), &coord);

      if (serializer.mustSerializeCoordinate(&coord)) {
        MeshTile *tile = tiler.createMeshTile(reader, coord);
        serializer.serializeTile(tile, writeVertexNormals);
        delete tile;
      }
      showProgress(++currentIndex);
    }
  }
}
```

`getOrReadRasterHeights` 함수도 `HEIGHT_CACHE_MAX_SIZE = 128`로 같이 맞춰주시면 됩니다.
