/* static */
GDALDataset *
GDALTiler::buildWarpedVRT(const GDALTiler &tiler,
                           GDALDataset *dataset,
                           const TileCoordinate &coord)
{
  if (dataset == nullptr)
    throw CTBException("No GDAL dataset is set");

  // Geo transform 계산
  double adfGeoTransform[6];
  const double resolution    = tiler.mGrid.resolution(coord.zoom);
  const CRSBounds tileBounds = tiler.mGrid.tileBounds(coord);

  adfGeoTransform[0] = tileBounds.getMinX();  // min longitude
  adfGeoTransform[1] = resolution;
  adfGeoTransform[2] = 0;
  adfGeoTransform[3] = tileBounds.getMaxY();  // max latitude
  adfGeoTransform[4] = 0;
  adfGeoTransform[5] = -resolution;

  GDALDatasetH hSrcDS = (GDALDatasetH) dataset;
  CPLStringList transformOptions;

  const char *pszSrcWKT  = GDALGetProjectionRef(hSrcDS);
  const char *pszGridWKT = pszSrcWKT;

  if (!strlen(pszSrcWKT))
    throw CTBException("The source dataset no longer has a spatial reference system assigned");

  if (tiler.requiresReprojection()) {
    pszGridWKT = tiler.crsWKT.c_str();
    transformOptions.SetNameValue("SRC_SRS", pszSrcWKT);
    transformOptions.SetNameValue("DST_SRS", pszGridWKT);
  }

  // Warp 옵션 구성
  GDALWarpOptions *psWarpOptions = GDALCreateWarpOptions();
  psWarpOptions->eResampleAlg      = tiler.options.resampleAlg;
  psWarpOptions->dfWarpMemoryLimit = tiler.options.warpMemoryLimit;
  psWarpOptions->hSrcDS            = hSrcDS;
  psWarpOptions->nBandCount        = tiler.poDataset->GetRasterCount();
  psWarpOptions->panSrcBands =
    (int *) CPLMalloc(sizeof(int) * psWarpOptions->nBandCount);
  psWarpOptions->panDstBands =
    (int *) CPLMalloc(sizeof(int) * psWarpOptions->nBandCount);
  psWarpOptions->padfSrcNoDataReal =
    (double *) CPLCalloc(psWarpOptions->nBandCount, sizeof(double));
  psWarpOptions->padfSrcNoDataImag =
    (double *) CPLCalloc(psWarpOptions->nBandCount, sizeof(double));
  psWarpOptions->padfDstNoDataReal =
    (double *) CPLCalloc(psWarpOptions->nBandCount, sizeof(double));
  psWarpOptions->padfDstNoDataImag =
    (double *) CPLCalloc(psWarpOptions->nBandCount, sizeof(double));

  for (short unsigned int i = 0; i < psWarpOptions->nBandCount; ++i) {
    int bGotNoData = FALSE;
    double noDataValue =
      tiler.poDataset->GetRasterBand(i + 1)->GetNoDataValue(&bGotNoData);
    if (!bGotNoData) noDataValue = -32768;

    psWarpOptions->padfSrcNoDataReal[i] = noDataValue;
    psWarpOptions->padfSrcNoDataImag[i] = 0;
    psWarpOptions->padfDstNoDataReal[i] = noDataValue;
    psWarpOptions->padfDstNoDataImag[i] = 0;
    psWarpOptions->panDstBands[i] = psWarpOptions->panSrcBands[i] = i + 1;
  }

  // Transformer 생성
  void *transformerArg =
    GDALCreateGenImgProjTransformer2(hSrcDS, nullptr, transformOptions.List());
  if (transformerArg == nullptr) {
    GDALDestroyWarpOptions(psWarpOptions);
    throw CTBException("Could not create image to image transformer");
  }

  GDALSetGenImgProjTransformerDstGeoTransform(transformerArg, adfGeoTransform);

  // Overview 선택
  GDALDatasetH hWrkSrcDS =
    tiler.getOverviewDataset(hSrcDS, GDALGenImgProjTransform, transformerArg);
  if (hWrkSrcDS == nullptr) {
    hWrkSrcDS = psWarpOptions->hSrcDS = hSrcDS;
  } else {
    psWarpOptions->hSrcDS = hWrkSrcDS;
    GDALDestroyGenImgProjTransformer(transformerArg);

    transformerArg =
      GDALCreateGenImgProjTransformer2(hWrkSrcDS, nullptr, transformOptions.List());
    if (transformerArg == nullptr) {
      GDALDestroyWarpOptions(psWarpOptions);
      throw CTBException("Could not create overview image to image transformer");
    }
    GDALSetGenImgProjTransformerDstGeoTransform(transformerArg, adfGeoTransform);
  }

  // Approximate vs Exact transform
  if (tiler.options.errorThreshold) {
    psWarpOptions->pTransformerArg =
      GDALCreateApproxTransformer(GDALGenImgProjTransform,
                                  transformerArg, tiler.options.errorThreshold);
    if (psWarpOptions->pTransformerArg == nullptr) {
      GDALDestroyWarpOptions(psWarpOptions);
      GDALDestroyGenImgProjTransformer(transformerArg);
      throw CTBException("Could not create linear approximator");
    }
    psWarpOptions->pfnTransformer = GDALApproxTransform;
    // ApproxTransformer가 transformerArg 내부 소유 → 별도 해제 불필요
  } else {
    psWarpOptions->pTransformerArg = transformerArg;
    psWarpOptions->pfnTransformer  = GDALGenImgProjTransform;
  }

  // VRT dataset 생성
  GDALDatasetH hDstDS = GDALCreateWarpedVRT(
    hWrkSrcDS, tiler.mGrid.tileSize(), tiler.mGrid.tileSize(),
    adfGeoTransform, psWarpOptions);
  GDALDestroyWarpOptions(psWarpOptions);

  if (hDstDS == nullptr) {
    GDALDestroyGenImgProjTransformer(transformerArg);
    throw CTBException("Could not create warped VRT");
  }

  if (GDALSetProjection(hDstDS, pszGridWKT) != CE_None) {
    GDALClose(hDstDS);
    throw CTBException("Could not set projection on VRT");
  }

  if (GDALSetGeoTransform(hDstDS, adfGeoTransform) != CE_None) {
    GDALClose(hDstDS);
    throw CTBException("Could not set geo transform on VRT");
  }

  return (GDALDataset *) hDstDS;  // 호출자가 GDALClose 책임
}


// ─── GDALDatasetReader::readRasterHeights ────────────────────────────────

/* static */
std::vector<float>
ctb::GDALDatasetReader::readRasterHeights(const GDALTiler &tiler,
                                           GDALDataset *dataset,
                                           const TileCoordinate &coord,
                                           ctb::i_tile tileSizeX,
                                           ctb::i_tile tileSizeY)
{
  GDALDataset *vrtDataset = GDALTiler::buildWarpedVRT(tiler, dataset, coord);

  const ctb::i_tile TILE_CELL_SIZE = tileSizeX * tileSizeY;
  std::vector<float> rasterHeights(TILE_CELL_SIZE, 0.0f);

  GDALRasterBand *heightsBand = vrtDataset->GetRasterBand(1);

  if (heightsBand->RasterIO(GF_Read, 0, 0, tileSizeX, tileSizeY,
                             rasterHeights.data(),
                             tileSizeX, tileSizeY,
                             GDT_Float32, 0, 0) != CE_None) {
    GDALClose(vrtDataset);
    throw CTBException("Could not read heights from raster");
  }

  GDALClose(vrtDataset);
  return rasterHeights;  // NRVO 적용
}
