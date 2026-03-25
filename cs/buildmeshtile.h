const std::vector<float> &neighborHeights = getOrReadRasterHeights(dataset, neighborCoord);
ctb::chunk::heightfield neighborHeightfield(neighborHeights.data(), TILE_SIZE);

// levels 캐시 확인
auto levIt = std::find_if(mLevelsCache.begin(), mLevelsCache.end(),
  [&](const auto &entry) { return entry.first == neighborCoord; });

if (levIt != mLevelsCache.end()) {
  // 캐시 hit → applyGeometricError skip
  neighborHeightfield.setLevels(levIt->second);
} else {
  neighborHeightfield.applyGeometricError(maximumGeometricError);

  // 캐시 저장
  if (mLevelsCache.size() >= HEIGHT_CACHE_MAX_SIZE)
    mLevelsCache.erase(mLevelsCache.begin());
  mLevelsCache.emplace_back(neighborCoord, neighborHeightfield.getLevels());
}

heightfield.applyBorderActivationState(neighborHeightfield, borderIndex);


const std::vector<float> &
ctb::MeshTiler::getOrReadRasterHeights(GDALDataset *dataset, const ctb::TileCoordinate &coord) {
  auto it = std::find_if(mHeightCache.begin(), mHeightCache.end(),
    [&](const auto &entry) { return entry.first == coord; });

  if (it == mHeightCache.end()) {
    if (mHeightCache.size() >= HEIGHT_CACHE_MAX_SIZE) {
      mHeightCache.erase(mHeightCache.begin());
    }
    std::vector<float> heights;
    ctb::GDALDatasetReader::readRasterHeights(
      *this, dataset, coord, mGrid.tileSize(), mGrid.tileSize(), heights
    );
    mHeightCache.emplace_back(coord, std::move(heights));
    it = std::prev(mHeightCache.end());
  }

  return it->second;
}
그러면 buildMeshTile 안에서는:
const std::vector<float> &neighborHeights = getOrReadRasterHeights(dataset, neighborCoord);
ctb::chunk::heightfield neighborHeightfield(neighborHeights.data(), TILE_SIZE);

//////////
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
        auto it = std::find_if(mHeightCache.begin(), mHeightCache.end(),
          [&](const auto &entry) { return entry.first == neighborCoord; });

        if (it == mHeightCache.end()) {
          if (mHeightCache.size() >= HEIGHT_CACHE_MAX_SIZE) {
            mHeightCache.erase(mHeightCache.begin());
          }
          std::vector<float> heights;
          ctb::GDALDatasetReader::readRasterHeights(
            *this, dataset, neighborCoord, mGrid.tileSize(), mGrid.tileSize(), heights
          );
          mHeightCache.emplace_back(neighborCoord, std::move(heights));
          it = std::prev(mHeightCache.end());
        }

        ctb::chunk::heightfield neighborHeightfield(it->second.data(), TILE_SIZE);
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

    if (!(bounds().overlaps(tileBounds))) {
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
