// MeshTiler.h
private:
  mutable std::unordered_map<ctb::TileCoordinate, std::vector<float>, TileCoordinateHash> mHeightCache;
  static constexpr size_t HEIGHT_CACHE_MAX_SIZE = 16;
// prepareSettingsOfTile 내부 - neighborHeights 읽는 부분만 교체
if (datasetBounds.overlaps(neighborBounds)) {
  
  auto it = mHeightCache.find(neighborCoord);
  if (it == mHeightCache.end()) {
    if (mHeightCache.size() >= HEIGHT_CACHE_MAX_SIZE) {
      mHeightCache.erase(mHeightCache.begin());
    }
    float *raw = ctb::GDALDatasetReader::readRasterHeights(
      *this, dataset, neighborCoord, mGrid.tileSize(), mGrid.tileSize()
    );
    size_t count = static_cast<size_t>(mGrid.tileSize()) * mGrid.tileSize();
    it = mHeightCache.emplace(neighborCoord, std::vector<float>(raw, raw + count)).first;
    CPLFree(raw);
  }

  ctb::chunk::heightfield neighborHeightfield(it->second.data(), TILE_SIZE);
  neighborHeightfield.applyGeometricError(maximumGeometricError);
  heightfield.applyBorderActivationState(neighborHeightfield, borderIndex);
}
TileCoordinate에 operator
