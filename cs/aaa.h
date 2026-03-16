GDALTile *
GDALTiler::createRasterTile(GDALDataset *dataset, const TileCoordinate &coord) const {
  // Convert the tile bounds into a geo transform
  double adfGeoTransform[6],
    resolution = mGrid.resolution(coord.zoom);
  CRSBounds tileBounds = mGrid.tileBounds(coord);

  adfGeoTransform[0] = tileBounds.getMinX(); // min longitude
  adfGeoTransform[1] = resolution;
  adfGeoTransform[2] = 0;
  adfGeoTransform[3] = tileBounds.getMaxY(); // max latitude
  adfGeoTransform[4] = 0;
  adfGeoTransform[5] = -resolution;

  GDALTile *tile = createRasterTile(dataset, adfGeoTransform);
  static_cast<TileCoordinate &>(*tile) = coord;

  // Set the shifted geo transform to the VRT
  if (GDALSetGeoTransform(tile->dataset, adfGeoTransform) != CE_None) {
    throw CTBException("Could not set geo transform on VRT");
  }

  return tile;
}

GDALTile *
GDALTiler::createRasterTile(GDALDataset *dataset, double (&adfGeoTransform)[6]) const {
  if (dataset == NULL) {
    throw CTBException("No GDAL dataset is set");
  }

  // The source and sink datasets
  GDALDatasetH hSrcDS = (GDALDatasetH) dataset;
  GDALDatasetH hDstDS;

  // The transformation option list
  CPLStringList transformOptions;

  // The source, sink and grid srs
  const char *pszSrcWKT = GDALGetProjectionRef(hSrcDS),
    *pszGridWKT = pszSrcWKT;

  if (!strlen(pszSrcWKT))
    throw CTBException("The source dataset no longer has a spatial reference system assigned");

  // Populate the SRS WKT strings if we need to reproject
  if (requiresReprojection()) {
    pszGridWKT = crsWKT.c_str();
    transformOptions.SetNameValue("SRC_SRS", pszSrcWKT);
    transformOptions.SetNameValue("DST_SRS", pszGridWKT);
  }

  // Set the warp options
  GDALWarpOptions *psWarpOptions = GDALCreateWarpOptions();
  psWarpOptions->eResampleAlg = options.resampleAlg;
  psWarpOptions->dfWarpMemoryLimit = options.warpMemoryLimit;
  psWarpOptions->hSrcDS = hSrcDS;
  psWarpOptions->nBandCount = poDataset->GetRasterCount();
  psWarpOptions->panSrcBands =
    (int *) CPLMalloc(sizeof(int) * psWarpOptions->nBandCount );
  psWarpOptions->panDstBands =
    (int *) CPLMalloc(sizeof(int) * psWarpOptions->nBandCount );

  psWarpOptions->padfSrcNoDataReal =
    (double *)CPLCalloc(psWarpOptions->nBandCount, sizeof(double));
  psWarpOptions->padfSrcNoDataImag =
    (double *)CPLCalloc(psWarpOptions->nBandCount, sizeof(double));
  psWarpOptions->padfDstNoDataReal =
    (double *)CPLCalloc(psWarpOptions->nBandCount, sizeof(double));
  psWarpOptions->padfDstNoDataImag =
    (double *)CPLCalloc(psWarpOptions->nBandCount, sizeof(double));

  for (short unsigned int i = 0; i < psWarpOptions->nBandCount; ++i) {
    int bGotNoData = FALSE;
    double noDataValue = poDataset->GetRasterBand(i + 1)->GetNoDataValue(&bGotNoData);
    if (!bGotNoData) noDataValue = -32768;

    psWarpOptions->padfSrcNoDataReal[i] = noDataValue;
    psWarpOptions->padfSrcNoDataImag[i] = 0;
    psWarpOptions->padfDstNoDataReal[i] = noDataValue;
    psWarpOptions->padfDstNoDataImag[i] = 0;

    psWarpOptions->panDstBands[i] = psWarpOptions->panSrcBands[i] = i + 1;
  }

  // Create the image to image transformer
  void *transformerArg = GDALCreateGenImgProjTransformer2(hSrcDS, NULL, transformOptions.List());
  if(transformerArg == NULL) {
    GDALDestroyWarpOptions(psWarpOptions);
    throw CTBException("Could not create image to image transformer");
  }

  // Specify the destination geotransform
  GDALSetGenImgProjTransformerDstGeoTransform(transformerArg, adfGeoTransform );

  // Try and get an overview from the source dataset that corresponds more
  // closely to the resolution of this tile.
  GDALDatasetH hWrkSrcDS = getOverviewDataset(hSrcDS, GDALGenImgProjTransform, transformerArg);
  if (hWrkSrcDS == NULL) {
    hWrkSrcDS = psWarpOptions->hSrcDS = hSrcDS;
  } else {
    psWarpOptions->hSrcDS = hWrkSrcDS;

    // We need to recreate the transform when operating on an overview.
    GDALDestroyGenImgProjTransformer( transformerArg );

    transformerArg = GDALCreateGenImgProjTransformer2( hWrkSrcDS, NULL, transformOptions.List() );
    if(transformerArg == NULL) {
      GDALDestroyWarpOptions(psWarpOptions);
      throw CTBException("Could not create overview image to image transformer");
    }

    // Specify the destination geotransform
    GDALSetGenImgProjTransformerDstGeoTransform(transformerArg, adfGeoTransform );
  }

  // Decide if we are doing an approximate or exact transformation
  if (options.errorThreshold) {
    // approximate: wrap the transformer with a linear approximator
    psWarpOptions->pTransformerArg =
      GDALCreateApproxTransformer(GDALGenImgProjTransform, transformerArg, options.errorThreshold);

    if (psWarpOptions->pTransformerArg == NULL) {
      GDALDestroyWarpOptions(psWarpOptions);
      GDALDestroyGenImgProjTransformer(transformerArg);
      throw CTBException("Could not create linear approximator");
    }

    psWarpOptions->pfnTransformer = GDALApproxTransform;

  } else {
    // exact: no wrapping required
    psWarpOptions->pTransformerArg = transformerArg;
    psWarpOptions->pfnTransformer = GDALGenImgProjTransform;
  }

  // The raster tile is represented as a VRT dataset
  hDstDS = GDALCreateWarpedVRT(hWrkSrcDS, mGrid.tileSize(), mGrid.tileSize(), adfGeoTransform, psWarpOptions);

  bool isApproxTransform = (psWarpOptions->pfnTransformer == GDALApproxTransform);
  GDALDestroyWarpOptions( psWarpOptions );

  if (hDstDS == NULL) {
    GDALDestroyGenImgProjTransformer(transformerArg);
    throw CTBException("Could not create warped VRT");
  }

  // Set the projection information on the dataset. This will always be the grid
  // SRS.
  if (GDALSetProjection( hDstDS, pszGridWKT ) != CE_None) {
    GDALClose(hDstDS);
    if (transformerArg != NULL) {
      GDALDestroyGenImgProjTransformer(transformerArg);
    }
    throw CTBException("Could not set projection on VRT");
  }

  // If uncommenting the following line for debug purposes, you must also `#include "vrtdataset.h"`
  //std::cout << "VRT: " << CPLSerializeXMLTree(((VRTWarpedDataset *) hDstDS)->SerializeToXML(NULL)) << std::endl;

  // Create the tile, passing it the base image transformer to manage if this is
  // an approximate transform
  return new GDALTile((GDALDataset *) hDstDS,
                      isApproxTransform
                      ? transformerArg : NULL);
}

float *
ctb::GDALDatasetReader::readRasterHeights(const GDALTiler &tiler, GDALDataset *dataset, const TileCoordinate &coord, ctb::i_tile tileSizeX, ctb::i_tile tileSizeY) {
  GDALTile *rasterTile = createRasterTile(tiler, dataset, coord); // the raster associated with this tile coordinate

  const ctb::i_tile TILE_CELL_SIZE = tileSizeX * tileSizeY;
  float *rasterHeights = (float *)CPLCalloc(TILE_CELL_SIZE, sizeof(float));

  GDALRasterBand *heightsBand = rasterTile->dataset->GetRasterBand(1);

  if (heightsBand->RasterIO(GF_Read, 0, 0, tileSizeX, tileSizeY,
                            (void *) rasterHeights, tileSizeX, tileSizeY, GDT_Float32,
                            0, 0) != CE_None) {
    delete rasterTile;
    CPLFree(rasterHeights);

    throw CTBException("Could not read heights from raster");
  }
  delete rasterTile;
  return rasterHeights;
}
