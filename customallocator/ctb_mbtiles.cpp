/*******************************************************************************
 * Copyright 2014 GeoData <geodata@soton.ac.uk>
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License.  You may obtain a copy
 * of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *******************************************************************************/

#include <iostream>
#include <sstream>
#include <string.h>
#include <stdlib.h>
#include <thread>
#include <mutex>
#include <future>

#include "cpl_multiproc.h"
#include "cpl_vsi.h"
#include "gdal_priv.h"
#include "commander.hpp"
#include "concat.hpp"

#include "GlobalMercator.hpp"
#include "RasterIterator.hpp"
#include "TerrainIterator.hpp"
#include "MeshIterator.hpp"
#include "GDALDatasetReader.hpp"
#include "CTBFileTileSerializer.hpp"

// [MBTiles] SQLite3
#include <sqlite3.h>

using namespace std;
using namespace ctb;

#ifdef _WIN32
static const char *osDirSep = "\\";
#else
static const char *osDirSep = "/";
#endif

// ============================================================
// [MBTiles] 전역 DB 핸들 및 mutex
// ============================================================
static sqlite3    *mbtiles_db = nullptr;
static std::mutex  mbtilesMutex;

/// MBTiles Y축 반전: XYZ(CTB) → TMS 스펙
static int mbtiles_flipY(int y, int zoom) {
  return (1 << zoom) - 1 - y;
}

/// MBTiles 파일 초기화
static void initMBTiles(const char *path) {
  if (sqlite3_open(path, &mbtiles_db) != SQLITE_OK) {
    string msg = string("Cannot open MBTiles: ") + sqlite3_errmsg(mbtiles_db);
    throw CTBException(msg.c_str());
  }

  const char *sqls[] = {
    "PRAGMA journal_mode=WAL;",       // 멀티스레드 write 성능
    "PRAGMA synchronous=NORMAL;",
    "CREATE TABLE IF NOT EXISTS tiles ("
    "  zoom_level  INTEGER NOT NULL,"
    "  tile_column INTEGER NOT NULL,"
    "  tile_row    INTEGER NOT NULL,"
    "  tile_data   BLOB    NOT NULL,"
    "  PRIMARY KEY (zoom_level, tile_column, tile_row));",
    "CREATE TABLE IF NOT EXISTS metadata ("
    "  name  TEXT PRIMARY KEY,"
    "  value TEXT);",
    nullptr
  };

  for (int i = 0; sqls[i]; ++i) {
    char *err = nullptr;
    if (sqlite3_exec(mbtiles_db, sqls[i], nullptr, nullptr, &err) != SQLITE_OK) {
      string msg = string("MBTiles init error: ") + (err ? err : "unknown");
      sqlite3_free(err);
      throw CTBException(msg.c_str());
    }
  }
}

/// 메타데이터 INSERT
static void insertMBTilesMetadata(const char *name, const char *value) {
  sqlite3_stmt *stmt;
  sqlite3_prepare_v2(mbtiles_db,
    "INSERT OR REPLACE INTO metadata (name, value) VALUES (?, ?);",
    -1, &stmt, nullptr);
  sqlite3_bind_text(stmt, 1, name,  -1, SQLITE_STATIC);
  sqlite3_bind_text(stmt, 2, value, -1, SQLITE_STATIC);
  sqlite3_step(stmt);
  sqlite3_finalize(stmt);
}

/// 타일 blob INSERT (thread-safe)
static void insertTileMBTiles(int zoom, int x, int y, const void *data, int dataLen) {
  int tmsY = mbtiles_flipY(y, zoom);

  std::lock_guard<std::mutex> lock(mbtilesMutex);

  sqlite3_stmt *stmt;
  sqlite3_prepare_v2(mbtiles_db,
    "INSERT OR REPLACE INTO tiles "
    "(zoom_level, tile_column, tile_row, tile_data) VALUES (?, ?, ?, ?);",
    -1, &stmt, nullptr);
  sqlite3_bind_int (stmt, 1, zoom);
  sqlite3_bind_int (stmt, 2, x);
  sqlite3_bind_int (stmt, 3, tmsY);
  sqlite3_bind_blob(stmt, 4, data, dataLen, SQLITE_STATIC);
  sqlite3_step(stmt);
  sqlite3_finalize(stmt);
}

// ============================================================
// [MBTiles] CTBMBTilesMeshSerializer
//
// MeshSerializer 인터페이스를 구현.
// MeshTile::writeFile() 결과를 /vsimem/ 가상경로에 직렬화한 뒤
// blob으로 읽어 SQLite tiles 테이블에 INSERT한다.
//
// buildMesh()는 MeshSerializer& 를 받으므로,
// CTBFileTileSerializer 대신 이 클래스를 그대로 넘길 수 있다.
// ============================================================
class CTBMBTilesMeshSerializer : public MeshSerializer {
public:
  CTBMBTilesMeshSerializer() {}

  // resume 로직 없음 (필요 시 DB SELECT로 구현 가능)
  bool mustSerializeCoordinate(const TileCoordinate *coordinate) override {
    return true;
  }

  void serializeTile(MeshTile *tile, bool writeVertexNormals = false) override {
    const TileCoordinate &coord = tile->getCoordinate();

    // 스레드별 고유 /vsimem 경로 — 멀티스레드 경로 충돌 방지
    ostringstream vpath_ss;
    vpath_ss << "/vsimem/mesh_tile_"
             << std::hash<std::thread::id>{}(std::this_thread::get_id())
             << ".terrain";
    const string vpath = vpath_ss.str();

    // Quantized-Mesh 포맷으로 가상 파일에 직렬화
    tile->writeFile(vpath.c_str(), writeVertexNormals);

    // 가상 파일에서 blob 읽기
    vsi_l_offset fileLen = 0;
    GByte *data = VSIGetMemFileBuffer(vpath.c_str(), &fileLen, FALSE);

    if (data && fileLen > 0) {
      insertTileMBTiles(coord.zoom, coord.x, coord.y, data, (int)fileLen);
    }

    VSIUnlink(vpath.c_str()); // 가상 파일 정리
  }

  void startSerialization() override {}
  void endSerialization()   override {}
};

// ============================================================
// TerrainBuild 클래스
// ============================================================
class TerrainBuild : public Command {
public:
  TerrainBuild(const char *name, const char *version) :
    Command(name, version),
    outputDir("."),
    outputFormat("Terrain"),
    profile("geodetic"),
    threadCount(-1),
    tileSize(0),
    startZoom(-1),
    endZoom(-1),
    verbosity(1),
    resume(false),
    meshQualityFactor(1.0),
    metadata(false),
    cesiumFriendly(false),
    vertexNormals(false),
    outputMbtiles(nullptr)   // [MBTiles]
  {}

  void check() const {
    switch(command->argc) {
    case 1: return;
    case 0: cerr << "  Error: The gdal datasource must be specified" << endl; break;
    default: cerr << "  Error: Only one command line argument must be specified" << endl; break;
    }
    help();
  }

  static void setOutputDir(command_t *command) {
    static_cast<TerrainBuild *>(Command::self(command))->outputDir = command->arg;
  }
  static void setOutputFormat(command_t *command) {
    static_cast<TerrainBuild *>(Command::self(command))->outputFormat = command->arg;
  }
  static void setProfile(command_t *command) {
    static_cast<TerrainBuild *>(Command::self(command))->profile = command->arg;
  }
  static void setThreadCount(command_t *command) {
    static_cast<TerrainBuild *>(Command::self(command))->threadCount = atoi(command->arg);
  }
  static void setTileSize(command_t *command) {
    static_cast<TerrainBuild *>(Command::self(command))->tileSize = atoi(command->arg);
  }
  static void setStartZoom(command_t *command) {
    static_cast<TerrainBuild *>(Command::self(command))->startZoom = atoi(command->arg);
  }
  static void setEndZoom(command_t *command) {
    static_cast<TerrainBuild *>(Command::self(command))->endZoom = atoi(command->arg);
  }
  static void setQuiet(command_t *command) {
    --(static_cast<TerrainBuild *>(Command::self(command))->verbosity);
  }
  static void setVerbose(command_t *command) {
    ++(static_cast<TerrainBuild *>(Command::self(command))->verbosity);
  }
  static void setResume(command_t *command) {
    static_cast<TerrainBuild *>(Command::self(command))->resume = true;
  }
  static void setResampleAlg(command_t *command) {
    GDALResampleAlg eResampleAlg;
    if      (strcmp(command->arg, "nearest")     == 0) eResampleAlg = GRA_NearestNeighbour;
    else if (strcmp(command->arg, "bilinear")    == 0) eResampleAlg = GRA_Bilinear;
    else if (strcmp(command->arg, "cubic")       == 0) eResampleAlg = GRA_Cubic;
    else if (strcmp(command->arg, "cubicspline") == 0) eResampleAlg = GRA_CubicSpline;
    else if (strcmp(command->arg, "lanczos")     == 0) eResampleAlg = GRA_Lanczos;
    else if (strcmp(command->arg, "average")     == 0) eResampleAlg = GRA_Average;
    else if (strcmp(command->arg, "mode")        == 0) eResampleAlg = GRA_Mode;
    else if (strcmp(command->arg, "max")         == 0) eResampleAlg = GRA_Max;
    else if (strcmp(command->arg, "min")         == 0) eResampleAlg = GRA_Min;
    else if (strcmp(command->arg, "med")         == 0) eResampleAlg = GRA_Med;
    else if (strcmp(command->arg, "q1")          == 0) eResampleAlg = GRA_Q1;
    else if (strcmp(command->arg, "q3")          == 0) eResampleAlg = GRA_Q3;
    else {
      cerr << "Error: Unknown resampling algorithm: " << command->arg << endl;
      static_cast<TerrainBuild *>(Command::self(command))->help();
    }
    static_cast<TerrainBuild *>(Command::self(command))->tilerOptions.resampleAlg = eResampleAlg;
  }
  static void addCreationOption(command_t *command) {
    static_cast<TerrainBuild *>(Command::self(command))->creationOptions.AddString(command->arg);
  }
  static void setErrorThreshold(command_t *command) {
    static_cast<TerrainBuild *>(Command::self(command))->tilerOptions.errorThreshold = atof(command->arg);
  }
  static void setWarpMemory(command_t *command) {
    static_cast<TerrainBuild *>(Command::self(command))->tilerOptions.warpMemoryLimit = atof(command->arg);
  }
  static void setMeshQualityFactor(command_t *command) {
    static_cast<TerrainBuild *>(Command::self(command))->meshQualityFactor = atof(command->arg);
  }
  static void setMetadata(command_t *command) {
    static_cast<TerrainBuild *>(Command::self(command))->metadata = true;
  }
  static void setCesiumFriendly(command_t *command) {
    static_cast<TerrainBuild *>(Command::self(command))->cesiumFriendly = true;
  }
  static void setVertexNormals(command_t *command) {
    static_cast<TerrainBuild *>(Command::self(command))->vertexNormals = true;
  }
  // [MBTiles] setter
  static void setOutputMbtiles(command_t *command) {
    static_cast<TerrainBuild *>(Command::self(command))->outputMbtiles = command->arg;
  }

  const char *getInputFilename() const {
    return (command->argc == 1) ? command->argv[0] : NULL;
  }

  // [MBTiles] Mesh + MBTiles 모드 여부
  bool useMbtiles() const {
    return outputMbtiles != nullptr && strlen(outputMbtiles) > 0;
  }

  const char *outputDir, *outputFormat, *profile;
  int threadCount, tileSize, startZoom, endZoom, verbosity;
  bool resume;
  CPLStringList creationOptions;
  TilerOptions tilerOptions;
  double meshQualityFactor;
  bool metadata, cesiumFriendly, vertexNormals;
  const char *outputMbtiles;  // [MBTiles]
};

// ============================================================
// 이하 헬퍼 — 원본과 동일
// ============================================================

static int globalIteratorIndex = 0;
template<typename T> int
incrementIterator(T &iter, int currentIndex) {
  static mutex mutex;
  lock_guard<std::mutex> lock(mutex);
  while (currentIndex < globalIteratorIndex) { ++iter; ++currentIndex; }
  ++globalIteratorIndex;
  return currentIndex;
}

static int iteratorSize = 0;
template<typename T> void
setIteratorSize(T &iter) {
  static mutex mutex;
  lock_guard<std::mutex> lock(mutex);
  if (iteratorSize == 0) iteratorSize = iter.getSize();
}

static int CPL_STDCALL termProgress(double dfComplete, const char *pszMessage, void *pProgressArg) {
  static mutex mutex;
  int status;
  lock_guard<std::mutex> lock(mutex);
  status = GDALTermProgress(dfComplete, pszMessage, pProgressArg);
  return status;
}

static int CPL_STDCALL verboseProgress(double dfComplete, const char *pszMessage, void *pProgressArg) {
  stringstream stream;
  stream << "[" << (int)(dfComplete * 100) << "%] " << pszMessage << endl;
  cout << stream.str();
  return TRUE;
}

static GDALProgressFunc progressFunc = termProgress;

int showProgress(int currentIndex, string filename) {
  stringstream stream;
  stream << "created " << filename << " in thread " << this_thread::get_id();
  string message = stream.str();
  return progressFunc(currentIndex / (double)iteratorSize, message.c_str(), NULL);
}
int showProgress(int currentIndex) {
  return progressFunc(currentIndex / (double)iteratorSize, NULL, NULL);
}

static bool fileExists(const std::string &filename) {
  VSIStatBufL statbuf;
  return VSIStatExL(filename.c_str(), &statbuf, VSI_STAT_EXISTS_FLAG) == 0;
}

static bool fileCopy(const std::string &sourceFilename, const std::string &targetFilename) {
  FILE *fp_s = VSIFOpen(sourceFilename.c_str(), "rb");
  if (!fp_s) return false;
  FILE *fp_t = VSIFOpen(targetFilename.c_str(), "wb");
  if (!fp_t) return false;
  VSIFSeek(fp_s, 0, SEEK_END);
  long fileSize = VSIFTell(fp_s);
  if (fileSize > 0) {
    VSIFSeek(fp_s, 0, SEEK_SET);
    void *buffer = VSIMalloc(fileSize);
    VSIFRead(buffer, 1, fileSize, fp_s);
    VSIFWrite(buffer, 1, fileSize, fp_t);
    VSIFree(buffer);
  }
  VSIFClose(fp_t);
  VSIFClose(fp_s);
  return fileSize > 0;
}

// ============================================================
// TerrainMetadata — 원본과 동일
// ============================================================
class TerrainMetadata {
public:
  TerrainMetadata() {}
  struct LevelInfo {
    LevelInfo() { startX = startY = std::numeric_limits<int>::max(); finalX = finalY = std::numeric_limits<int>::min(); }
    int startX, startY, finalX, finalY;
    inline void add(const TileCoordinate *c) {
      startX = std::min(startX, (int)c->x); startY = std::min(startY, (int)c->y);
      finalX = std::max(finalX, (int)c->x); finalY = std::max(finalY, (int)c->y);
    }
    inline void add(const LevelInfo &l) {
      startX = std::min(startX, l.startX); startY = std::min(startY, l.startY);
      finalX = std::max(finalX, l.finalX); finalY = std::max(finalY, l.finalY);
    }
  };
  std::vector<LevelInfo> levels;
  CRSBounds bounds;

  void add(const Grid &grid, const TileCoordinate *coordinate) {
    CRSBounds tileBounds = grid.tileBounds(*coordinate);
    i_zoom zoom = coordinate->zoom;
    if ((1 + zoom) > levels.size()) levels.resize(1 + zoom, LevelInfo());
    levels[zoom].add(coordinate);
    if (bounds.getMaxX() == bounds.getMinX()) {
      bounds = tileBounds;
    } else {
      bounds.setMinX(std::min(bounds.getMinX(), tileBounds.getMinX()));
      bounds.setMinY(std::min(bounds.getMinY(), tileBounds.getMinY()));
      bounds.setMaxX(std::max(bounds.getMaxX(), tileBounds.getMaxX()));
      bounds.setMaxY(std::max(bounds.getMaxY(), tileBounds.getMaxY()));
    }
  }
  void add(const TerrainMetadata &o) {
    if (o.levels.size() == 0) return;
    if (o.levels.size() > levels.size()) levels.resize(o.levels.size(), LevelInfo());
    for (size_t i = 0; i < o.levels.size(); i++) levels[i].add(o.levels[i]);
    bounds.setMinX(std::min(bounds.getMinX(), o.bounds.getMinX()));
    bounds.setMinY(std::min(bounds.getMinY(), o.bounds.getMinY()));
    bounds.setMaxX(std::max(bounds.getMaxX(), o.bounds.getMaxX()));
    bounds.setMaxY(std::max(bounds.getMaxY(), o.bounds.getMaxY()));
  }

  void writeJsonFile(const std::string &filename, const std::string &datasetName,
                     const std::string &outputFormat = "Terrain",
                     const std::string &profile = "geodetic",
                     bool writeVertexNormals = false) const {
    FILE *fp = fopen(filename.c_str(), "w");
    if (!fp) throw CTBException("Failed to open metadata file");
    fprintf(fp, "{\n");
    fprintf(fp, "  \"tilejson\": \"2.1.0\",\n");
    fprintf(fp, "  \"name\": \"%s\",\n", datasetName.c_str());
    fprintf(fp, "  \"description\": \"\",\n");
    fprintf(fp, "  \"version\": \"1.1.0\",\n");
    if      (strcmp(outputFormat.c_str(), "Terrain") == 0) fprintf(fp, "  \"format\": \"heightmap-1.0\",\n");
    else if (strcmp(outputFormat.c_str(), "Mesh")    == 0) fprintf(fp, "  \"format\": \"quantized-mesh-1.0\",\n");
    else                                                   fprintf(fp, "  \"format\": \"GDAL\",\n");
    fprintf(fp, "  \"attribution\": \"\",\n");
    fprintf(fp, "  \"schema\": \"tms\",\n");
    if (writeVertexNormals) fprintf(fp, "  \"extensions\": [ \"octvertexnormals\" ],\n");
    fprintf(fp, "  \"tiles\": [ \"{z}/{x}/{y}.terrain?v={version}\" ],\n");
    fprintf(fp, "  \"projection\": \"%s\",\n", strcmp(profile.c_str(), "geodetic") == 0 ? "EPSG:4326" : "EPSG:3857");
    fprintf(fp, "  \"bounds\": [ %.2f, %.2f, %.2f, %.2f ],\n",
      bounds.getMinX(), bounds.getMinY(), bounds.getMaxX(), bounds.getMaxY());
    fprintf(fp, "  \"available\": [\n");
    for (size_t i = 0, icount = levels.size(); i < icount; i++) {
      const LevelInfo &level = levels[i];
      fprintf(fp, (i > 0) ? "   ,[ " : "    [ ");
      if (level.finalX >= level.startX)
        fprintf(fp, "{ \"startX\": %i, \"startY\": %i, \"endX\": %i, \"endY\": %i }",
          level.startX, level.startY, level.finalX, level.finalY);
      fprintf(fp, " ]\n");
    }
    fprintf(fp, "  ]\n}\n");
    fclose(fp);
  }
};

// ============================================================
// createEmptyRootElevationFile — 원본과 동일
// ============================================================
static std::string
createEmptyRootElevationFile(std::string &fileName, const Grid &grid, const TileCoordinate &coord) {
  GDALDriver *poDriver = GetGDALDriverManager()->GetDriverByName("GTiff");
  if (!poDriver) throw CTBException("Could not retrieve GTiff GDAL driver");

  CRSBounds tileBounds = grid.tileBounds(coord);
  tileBounds.setMinX(tileBounds.getMinX() + 1); tileBounds.setMinY(tileBounds.getMinY() + 1);
  tileBounds.setMaxX(tileBounds.getMaxX() - 1); tileBounds.setMaxY(tileBounds.getMaxY() - 1);
  const i_tile tileSize = grid.tileSize() - 2;
  const double resolution = tileBounds.getWidth() / tileSize;
  double adfGeoTransform[6] = { tileBounds.getMinX(), resolution, 0, tileBounds.getMaxY(), 0, -resolution };

  OGRSpatialReference oSRS;
#if (GDAL_VERSION_MAJOR >= 3)
  oSRS.SetAxisMappingStrategy(OAMS_TRADITIONAL_GIS_ORDER);
#endif
  if (oSRS.importFromEPSG(4326) != OGRERR_NONE) throw CTBException("Could not create EPSG:4326 spatial reference");
  char *pszDstWKT = NULL;
  if (oSRS.exportToWkt(&pszDstWKT) != OGRERR_NONE) {
    CPLFree(pszDstWKT); throw CTBException("Could not create EPSG:4326 WKT string");
  }

  fileName += ".tif";
  GDALDataset *poDataset = poDriver->Create(fileName.c_str(), tileSize, tileSize, 1, GDT_Float32, NULL);
  if (poDataset->SetProjection(pszDstWKT) != CE_None) {
    poDataset->Release(); CPLFree(pszDstWKT);
    throw CTBException("Could not set projection on temporary elevation file");
  }
  CPLFree(pszDstWKT);
  if (poDataset->SetGeoTransform(adfGeoTransform) != CE_None) {
    poDataset->Release(); throw CTBException("Could not set GeoTransform on temporary elevation file");
  }
  float *rasterHeights = (float *)CPLCalloc(tileSize * tileSize, sizeof(float));
  GDALRasterBand *heightsBand = poDataset->GetRasterBand(1);
  if (heightsBand->RasterIO(GF_Write, 0, 0, tileSize, tileSize,
                            rasterHeights, tileSize, tileSize, GDT_Float32, 0, 0) != CE_None) {
    CPLFree(rasterHeights); throw CTBException("Could not write heights on temporary elevation file");
  }
  CPLFree(rasterHeights);
  poDataset->FlushCache(); poDataset->Release();
  return fileName;
}

// ============================================================
// buildGDAL — 원본과 동일
// ============================================================
static void
buildGDAL(GDALSerializer &serializer, const RasterTiler &tiler, TerrainBuild *command, TerrainMetadata *metadata) {
  GDALDriver *poDriver = GetGDALDriverManager()->GetDriverByName(command->outputFormat);
  if (!poDriver)                    throw CTBException("Could not retrieve GDAL driver");
  if (!poDriver->pfnCreateCopy)     throw CTBException("The GDAL driver must support 'CreateCopy'");

  const char *extension = poDriver->GetMetadataItem(GDAL_DMD_EXTENSION);
  i_zoom startZoom = (command->startZoom < 0) ? tiler.maxZoomLevel() : command->startZoom,
         endZoom   = (command->endZoom   < 0) ? 0 : command->endZoom;

  RasterIterator iter(tiler, startZoom, endZoom);
  int currentIndex = incrementIterator(iter, 0);
  setIteratorSize(iter);

  while (!iter.exhausted()) {
    const TileCoordinate *coordinate = iter.GridIterator::operator*();
    if (metadata) metadata->add(tiler.grid(), coordinate);
    if (serializer.mustSerializeCoordinate(coordinate)) {
      GDALTile *tile = *iter;
      serializer.serializeTile(tile, poDriver, extension, command->creationOptions);
      delete tile;
    }
    currentIndex = incrementIterator(iter, currentIndex);
    showProgress(currentIndex);
  }
}

// ============================================================
// buildTerrain — 원본과 동일
// ============================================================
static void
buildTerrain(TerrainSerializer &serializer, const TerrainTiler &tiler, TerrainBuild *command, TerrainMetadata *metadata) {
  i_zoom startZoom = (command->startZoom < 0) ? tiler.maxZoomLevel() : command->startZoom,
         endZoom   = (command->endZoom   < 0) ? 0 : command->endZoom;

  TerrainIterator iter(tiler, startZoom, endZoom);
  int currentIndex = incrementIterator(iter, 0);
  setIteratorSize(iter);
  GDALDatasetReaderWithOverviews reader(tiler);

  while (!iter.exhausted()) {
    const TileCoordinate *coordinate = iter.GridIterator::operator*();
    if (metadata) metadata->add(tiler.grid(), coordinate);
    if (serializer.mustSerializeCoordinate(coordinate)) {
      TerrainTile *tile = iter.operator*(&reader);
      serializer.serializeTile(tile);
      delete tile;
    }
    currentIndex = incrementIterator(iter, currentIndex);
    showProgress(currentIndex);
  }
}

// ============================================================
// buildMesh — 원본과 동일 (serializer 타입만 호출부에서 바꿈)
// ============================================================
static void
buildMesh(MeshSerializer &serializer, const MeshTiler &tiler, TerrainBuild *command, TerrainMetadata *metadata, bool writeVertexNormals = false) {
  i_zoom startZoom = (command->startZoom < 0) ? tiler.maxZoomLevel() : command->startZoom,
         endZoom   = (command->endZoom   < 0) ? 0 : command->endZoom;

  MeshIterator iter(tiler, startZoom, endZoom);
  int currentIndex = incrementIterator(iter, 0);
  setIteratorSize(iter);
  GDALDatasetReaderWithOverviews reader(tiler);

  while (!iter.exhausted()) {
    const TileCoordinate *coordinate = iter.GridIterator::operator*();
    if (metadata) metadata->add(tiler.grid(), coordinate);

    if (serializer.mustSerializeCoordinate(coordinate)) {
      MeshTile *tile = iter.operator*(&reader);
      serializer.serializeTile(tile, writeVertexNormals);
      delete tile;
    }

    currentIndex = incrementIterator(iter, currentIndex);
    showProgress(currentIndex);
  }
}

static void
buildMetadata(const RasterTiler &tiler, TerrainBuild *command, TerrainMetadata *metadata) {
  const string dirname = string(command->outputDir) + osDirSep;
  i_zoom startZoom = (command->startZoom < 0) ? tiler.maxZoomLevel() : command->startZoom,
         endZoom   = (command->endZoom   < 0) ? 0 : command->endZoom;
  const std::string filename = concat(dirname, "layer.json");

  RasterIterator iter(tiler, startZoom, endZoom);
  int currentIndex = incrementIterator(iter, 0);
  setIteratorSize(iter);

  while (!iter.exhausted()) {
    const TileCoordinate *coordinate = iter.GridIterator::operator*();
    if (metadata) metadata->add(tiler.grid(), coordinate);
    currentIndex = incrementIterator(iter, currentIndex);
    showProgress(currentIndex, filename);
  }
}

// ============================================================
// runTiler — [MBTiles] Mesh 분기에서 serializer 선택
// ============================================================
static int
runTiler(const char *inputFilename, TerrainBuild *command, Grid *grid, TerrainMetadata *metadata) {
  GDALDataset *poDataset = (GDALDataset *)GDALOpen(inputFilename, GA_ReadOnly);
  if (!poDataset) {
    cerr << "Error: could not open GDAL dataset" << endl;
    return 1;
  }

  TerrainMetadata *threadMetadata = metadata ? new TerrainMetadata() : NULL;

  try {
    if (command->metadata) {
      CTBFileTileSerializer serializer(string(command->outputDir) + osDirSep, command->resume);
      serializer.startSerialization();
      const RasterTiler tiler(poDataset, *grid, command->tilerOptions);
      buildMetadata(tiler, command, threadMetadata);
      serializer.endSerialization();

    } else if (strcmp(command->outputFormat, "Terrain") == 0) {
      // heightmap-1.0 — 원본과 동일, 파일 serializer
      CTBFileTileSerializer serializer(string(command->outputDir) + osDirSep, command->resume);
      serializer.startSerialization();
      const TerrainTiler tiler(poDataset, *grid);
      buildTerrain(serializer, tiler, command, threadMetadata);
      serializer.endSerialization();

    } else if (strcmp(command->outputFormat, "Mesh") == 0) {
      // ── [MBTiles] Quantized-Mesh: serializer를 조건에 따라 선택 ──
      const MeshTiler tiler(poDataset, *grid, command->tilerOptions, command->meshQualityFactor);

      if (command->useMbtiles()) {
        // MBTiles 모드: CTBMBTilesMeshSerializer 사용
        CTBMBTilesMeshSerializer serializer;
        serializer.startSerialization();
        buildMesh(serializer, tiler, command, threadMetadata, command->vertexNormals);
        serializer.endSerialization();
      } else {
        // 파일 모드: 기존 CTBFileTileSerializer 사용
        CTBFileTileSerializer serializer(string(command->outputDir) + osDirSep, command->resume);
        serializer.startSerialization();
        buildMesh(serializer, tiler, command, threadMetadata, command->vertexNormals);
        serializer.endSerialization();
      }

    } else {
      // GDAL 포맷 — 원본과 동일
      CTBFileTileSerializer serializer(string(command->outputDir) + osDirSep, command->resume);
      serializer.startSerialization();
      const RasterTiler tiler(poDataset, *grid, command->tilerOptions);
      buildGDAL(serializer, tiler, command, threadMetadata);
      serializer.endSerialization();
    }

  } catch (CTBException &e) {
    cerr << "Error: " << e.what() << endl;
  }

  GDALClose(poDataset);

  if (threadMetadata) {
    static std::mutex mutex;
    std::lock_guard<std::mutex> lock(mutex);
    metadata->add(*threadMetadata);
    delete threadMetadata;
  }
  return 0;
}

// ============================================================
// main
// ============================================================
int
main(int argc, char *argv[]) {
  TerrainBuild command = TerrainBuild(argv[0], version.cstr);
  command.setUsage("[options] GDAL_DATASOURCE");

  // [MBTiles] -M 옵션을 가장 먼저 등록 (tippecanoe 스타일)
  command.option("-M", "--output-mbtiles <file.mbtiles>",
                 "output Quantized-Mesh tiles to MBTiles SQLite file (requires -f Mesh)",
                 TerrainBuild::setOutputMbtiles);

  command.option("-o", "--output-dir <dir>",             "specify the output directory for the tiles (defaults to working directory)", TerrainBuild::setOutputDir);
  command.option("-f", "--output-format <format>",       "specify the output format: `Terrain` (default), `Mesh` (Quantized-Mesh), or any GDAL format", TerrainBuild::setOutputFormat);
  command.option("-p", "--profile <profile>",            "specify the TMS profile: `geodetic` (default) or `mercator`", TerrainBuild::setProfile);
  command.option("-c", "--thread-count <count>",         "specify the number of threads to use", TerrainBuild::setThreadCount);
  command.option("-t", "--tile-size <size>",             "specify the size of the tiles in pixels", TerrainBuild::setTileSize);
  command.option("-s", "--start-zoom <zoom>",            "specify the zoom level to start at", TerrainBuild::setStartZoom);
  command.option("-e", "--end-zoom <zoom>",              "specify the zoom level to end at", TerrainBuild::setEndZoom);
  command.option("-r", "--resampling-method <algorithm>","specify the raster resampling algorithm", TerrainBuild::setResampleAlg);
  command.option("-n", "--creation-option <option>",     "specify a GDAL creation option", TerrainBuild::addCreationOption);
  command.option("-z", "--error-threshold <threshold>",  "error threshold for transformation approximation", TerrainBuild::setErrorThreshold);
  command.option("-m", "--warp-memory <bytes>",          "memory limit for warp operations", TerrainBuild::setWarpMemory);
  command.option("-R", "--resume",                       "do not overwrite existing files", TerrainBuild::setResume);
  command.option("-g", "--mesh-qfactor <factor>",        "mesh quality factor (default 1.0)", TerrainBuild::setMeshQualityFactor);
  command.option("-l", "--layer",                        "only output the layer.json metadata file", TerrainBuild::setMetadata);
  command.option("-C", "--cesium-friendly",              "force creation of missing root tiles", TerrainBuild::setCesiumFriendly);
  command.option("-N", "--vertex-normals",               "write Oct-Encoded Per-Vertex Normals (Mesh only)", TerrainBuild::setVertexNormals);
  command.option("-q", "--quiet",                        "only output errors", TerrainBuild::setQuiet);
  command.option("-v", "--verbose",                      "be more noisy", TerrainBuild::setVerbose);

  command.parse(argc, argv);
  command.check();

  GDALAllRegister();

  if      (command.verbosity > 1) progressFunc = verboseProgress;
  else if (command.verbosity < 1) progressFunc = GDALDummyProgress;

  // [MBTiles] 옵션 검증 및 DB 초기화
  if (command.useMbtiles()) {
    if (strcmp(command.outputFormat, "Mesh") != 0) {
      cerr << "Error: --output-mbtiles (-M) is only supported with -f Mesh" << endl;
      return 1;
    }
    try {
      initMBTiles(command.outputMbtiles);
    } catch (CTBException &e) {
      cerr << "Error: " << e.what() << endl;
      return 1;
    }
    // MBTiles 기본 메타데이터
    insertMBTilesMetadata("format", "quantized-mesh-1.0");
    insertMBTilesMetadata("type",   "overlay");
    if (command.getInputFilename())
      insertMBTilesMetadata("name", command.getInputFilename());

  } else {
    // 기존 출력 디렉토리 유효성 검사 (MBTiles 모드에서는 불필요)
    VSIStatBufL stat;
    if (VSIStatExL(command.outputDir, &stat, VSI_STAT_EXISTS_FLAG | VSI_STAT_NATURE_FLAG)) {
      cerr << "Error: The output directory does not exist: " << command.outputDir << endl;
      return 1;
    } else if (!VSI_ISDIR(stat.st_mode)) {
      cerr << "Error: The output filepath is not a directory: " << command.outputDir << endl;
      return 1;
    }
  }

  // Define the grid
  Grid grid;
  if (strcmp(command.profile, "geodetic") == 0) {
    int tileSize = (command.tileSize < 1) ? 65 : command.tileSize;
    grid = GlobalGeodetic(tileSize);
  } else if (strcmp(command.profile, "mercator") == 0) {
    int tileSize = (command.tileSize < 1) ? 256 : command.tileSize;
    grid = GlobalMercator(tileSize);
  } else {
    cerr << "Error: Unknown profile: " << command.profile << endl;
    return 1;
  }

  // Run tilers in threads
  vector<future<int>> tasks;
  int threadCount = (command.threadCount > 0) ? command.threadCount : CPLGetNumCPUs();

  const string dirname = string(command.outputDir) + osDirSep;
  const std::string layerJsonPath = concat(dirname, "layer.json");
  TerrainMetadata *metadata = command.metadata ? new TerrainMetadata() : NULL;

  for (int i = 0; i < threadCount; ++i) {
    packaged_task<int(const char *, TerrainBuild *, Grid *, TerrainMetadata *)> task(runTiler);
    tasks.push_back(task.get_future());
    thread(move(task), command.getInputFilename(), &command, &grid, metadata).detach();
  }

  for (auto &task : tasks) task.wait();
  for (auto &task : tasks) {
    int retval = task.get();
    if (retval) { delete metadata; return retval; }
  }

  // CesiumJS friendly — 원본과 동일
  if (command.cesiumFriendly && (strcmp(command.profile, "geodetic") == 0) && command.endZoom <= 0) {
    if (!command.metadata) {
      std::string dirName0  = string(command.outputDir) + osDirSep + "0" + osDirSep + "0";
      std::string dirName1  = string(command.outputDir) + osDirSep + "0" + osDirSep + "1";
      std::string tileName0 = dirName0 + osDirSep + "0.terrain";
      std::string tileName1 = dirName1 + osDirSep + "0.terrain";

      i_zoom missingZoom = 65535;
      ctb::TileCoordinate missingTileCoord(missingZoom, 0, 0);
      std::string missingTileName;

      if      ( fileExists(tileName0) && !fileExists(tileName1)) { VSIMkdir(dirName1.c_str(), 0755); missingTileCoord = ctb::TileCoordinate(0, 1, 0); missingTileName = tileName1; }
      else if (!fileExists(tileName0) &&  fileExists(tileName1)) { VSIMkdir(dirName0.c_str(), 0755); missingTileCoord = ctb::TileCoordinate(0, 0, 0); missingTileName = tileName0; }

      if (missingTileCoord.zoom != missingZoom) {
        globalIteratorIndex = 0;
        command.startZoom = command.endZoom = 0;
        missingTileName = createEmptyRootElevationFile(missingTileName, grid, missingTileCoord);
        runTiler(missingTileName.c_str(), &command, &grid, NULL);
        VSIUnlink(missingTileName.c_str());
      }
    }
    if (metadata && metadata->levels.size() > 0) {
      TerrainMetadata::LevelInfo &level = metadata->levels.at(0);
      level.startX = 0; level.startY = 0; level.finalX = 1; level.finalY = 0;
    }
  }

  if (metadata) {
    std::string datasetName(command.getInputFilename());
    datasetName = datasetName.substr(datasetName.find_last_of("/\\") + 1);
    const size_t rfindpos = datasetName.rfind('.');
    if (std::string::npos != rfindpos) datasetName = datasetName.erase(rfindpos);
    metadata->writeJsonFile(layerJsonPath, datasetName, std::string(command.outputFormat),
                            std::string(command.profile), command.vertexNormals);
    delete metadata;
  }

  // [MBTiles] 종료 시 DB 최적화 후 닫기
  if (mbtiles_db) {
    sqlite3_exec(mbtiles_db, "ANALYZE;", nullptr, nullptr, nullptr);
    sqlite3_close(mbtiles_db);
    mbtiles_db = nullptr;
  }

  return 0;
}
