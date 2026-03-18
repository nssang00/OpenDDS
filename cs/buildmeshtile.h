void 
ctb::MeshTiler::buildMeshTile(MeshTile *terrainTile, GDALDataset *dataset, const TileCoordinate &coord, float *rasterHeights, ctb::i_tile tileSizeX, ctb::i_tile tileSizeY) {
  const ctb::i_tile TILE_SIZE = tileSizeX;

  double resolutionAtLevelZero = mGrid.resolution(0);
  int numberOfTilesAtLevelZero = (int)(mGrid.getExtent().getWidth() / (tileSizeX * resolutionAtLevelZero));
  double heightmapTerrainQuality = 0.25;
  const double semiMajorAxis = 6378137.0;
  double maximumGeometricError = MeshTiler::getEstimatedLevelZeroGeometricErrorForAHeightmap(
    semiMajorAxis,
    heightmapTerrainQuality * mMeshQualityFactor,
    TILE_SIZE,
    numberOfTilesAtLevelZero
  );
  maximumGeometricError /= (double)(1 << coord.zoom);

  ctb::chunk::heightfield heightfield(rasterHeights, TILE_SIZE);
  heightfield.applyGeometricError(maximumGeometricError, coord.zoom <= 6);

  if (coord.zoom > 6) {
    ctb::CRSBounds datasetBounds = bounds();

    for (int borderIndex = 0; borderIndex < 4; borderIndex++) {
      bool okNeighborCoord = true;
      ctb::TileCoordinate neighborCoord = ctb::chunk::heightfield::neighborCoord(mGrid, coord, borderIndex, okNeighborCoord);
      if (!okNeighborCoord)
        continue;

      ctb::CRSBounds neighborBounds = mGrid.tileBounds(neighborCoord);

      if (datasetBounds.overlaps(neighborBounds)) {
        // ↓ 수정된 부분
        auto it = std::find_if(mHeightCache.begin(), mHeightCache.end(),
          [&](const auto &entry) { return entry.first == neighborCoord; });

        if (it == mHeightCache.end()) {
          if (mHeightCache.size() >= HEIGHT_CACHE_MAX_SIZE) {
            mHeightCache.erase(mHeightCache.begin());
          }
          float *raw = ctb::GDALDatasetReader::readRasterHeights(
            *this, dataset, neighborCoord, mGrid.tileSize(), mGrid.tileSize()
          );
          size_t count = static_cast<size_t>(mGrid.tileSize()) * mGrid.tileSize();
          mHeightCache.emplace_back(neighborCoord, std::vector<float>(raw, raw + count));
          it = std::prev(mHeightCache.end());
          CPLFree(raw);
        }

        ctb::chunk::heightfield neighborHeightfield(it->second.data(), TILE_SIZE);
        // ↑ 수정된 부분
        neighborHeightfield.applyGeometricError(maximumGeometricError);
        heightfield.applyBorderActivationState(neighborHeightfield, borderIndex);
      }
    }
  }

  ctb::CRSBounds mGridBounds = mGrid.tileBounds(coord);
  Mesh &tileMesh = terrainTile->getMesh();
  WrapperMesh mesh(mGridBounds, tileMesh, tileSizeX, tileSizeY);
  heightfield.generateMesh(mesh, 0);
  heightfield.clear();

  if (coord.zoom != maxZoomLevel()) {
    CRSBounds tileBounds = mGrid.tileBounds(coord);

    if (! (bounds().overlaps(tileBounds))) {
      terrainTile->setAllChildren(false);
    } else {
      if (bounds().overlaps(tileBounds.getSW())) {
        terrainTile->setChildSW();
      }
      if (bounds().overlaps(tileBounds.getNW())) {
        terrainTile->setChildNW();
      }
      if (bounds().overlaps(tileBounds.getNE())) {
        terrainTile->setChildNE();
      }
      if (bounds().overlaps(tileBounds.getSE())) {
        terrainTile->setChildSE();
      }
    }
  }
}
