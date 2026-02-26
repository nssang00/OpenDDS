#include <sqlite3.h>

class CTBMBTilesTileSerializer : public TileSerializer {
public:
  CTBMBTilesTileSerializer(const std::string &filename, bool resume)
    : m_filename(filename), m_resume(resume), m_db(nullptr) {}

  virtual void startSerialization() override {
    int rc = sqlite3_open(m_filename.c_str(), &m_db);
    if (rc != SQLITE_OK) throw CTBException("Cannot open MBTiles database");

    // WAL 모드 활성화 (선택사항)
    sqlite3_exec(m_db, "PRAGMA journal_mode=WAL;", nullptr, nullptr, nullptr);

    // tiles 테이블 생성
    const char *sql_tiles = 
      "CREATE TABLE IF NOT EXISTS tiles ("
      "zoom_level INTEGER, "
      "tile_column INTEGER, "
      "tile_row INTEGER, "
      "tile_data BLOB, "
      "PRIMARY KEY (zoom_level, tile_column, tile_row));";
    sqlite3_exec(m_db, sql_tiles, nullptr, nullptr, nullptr);

    // metadata 테이블 생성
    const char *sql_meta = 
      "CREATE TABLE IF NOT EXISTS metadata ("
      "name TEXT PRIMARY KEY, value TEXT);";
    sqlite3_exec(m_db, sql_meta, nullptr, nullptr, nullptr);

    // 트랜잭션 시작 (성능 향상)
    sqlite3_exec(m_db, "BEGIN;", nullptr, nullptr, nullptr);
  }

  virtual bool mustSerializeCoordinate(const TileCoordinate *coord) override {
    if (!m_resume) return true;
    // 이미 존재하는 타일인지 확인
    std::string sql = "SELECT 1 FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=? LIMIT 1;";
    sqlite3_stmt *stmt;
    sqlite3_prepare_v2(m_db, sql.c_str(), -1, &stmt, nullptr);
    sqlite3_bind_int(stmt, 1, coord->zoom);
    sqlite3_bind_int(stmt, 2, coord->x);
    // MBTiles의 tile_row는 TMS 기준: (2^zoom - 1 - y)
    int tmsRow = (1 << coord->zoom) - 1 - coord->y;
    sqlite3_bind_int(stmt, 3, tmsRow);
    int exists = (sqlite3_step(stmt) == SQLITE_ROW);
    sqlite3_finalize(stmt);
    return !exists;
  }

  virtual void serializeTile(TerrainTile *tile) override {
    // tile->data() 등으로 바이너리 데이터를 얻어 BLOB으로 저장
    const TileCoordinate *coord = tile->getCoordinate();
    int tmsRow = (1 << coord->zoom) - 1 - coord->y;

    std::string sql = "INSERT OR REPLACE INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES (?, ?, ?, ?);";
    sqlite3_stmt *stmt;
    sqlite3_prepare_v2(m_db, sql.c_str(), -1, &stmt, nullptr);
    sqlite3_bind_int(stmt, 1, coord->zoom);
    sqlite3_bind_int(stmt, 2, coord->x);
    sqlite3_bind_int(stmt, 3, tmsRow);
    // tile 데이터가 vector<unsigned char> 라고 가정
    const auto &data = tile->data(); // 예시
    sqlite3_bind_blob(stmt, 4, data.data(), data.size(), SQLITE_STATIC);
    sqlite3_step(stmt);
    sqlite3_finalize(stmt);
  }

  // GDALTile, MeshTile에 대해서도 오버로딩 또는 템플릿 사용

  virtual void endSerialization() override {
    sqlite3_exec(m_db, "COMMIT;", nullptr, nullptr, nullptr);
    sqlite3_close(m_db);
  }

private:
  std::string m_filename;
  bool m_resume;
  sqlite3 *m_db;
};


///////////
// main 함수 내부
TileSerializer *serializer = nullptr;
if (command.mbtilesFilename) {
  serializer = new CTBMBTilesTileSerializer(command.mbtilesFilename, command.resume);
} else {
  serializer = new CTBFileTileSerializer(string(command.outputDir) + osDirSep, command.resume);
}

// runTiler 등에서 serializer 사용 (기존 코드는 CTBFileTileSerializer에 의존적이므로 인터페이스 수정 필요)

// metadata 저장 부분
if (metadata) {
  if (command.mbtilesFilename) {
    // MBTiles 파일을 다시 열어 메타데이터 저장
    sqlite3 *db;
    sqlite3_open(command.mbtilesFilename, &db);
    metadata->writeJsonToMBTiles(db, datasetName, command.outputFormat, command.profile, command.vertexNormals);
    sqlite3_close(db);
  } else {
    metadata->writeJsonFile(filename, datasetName, command.outputFormat, command.profile, command.vertexNormals);
  }
  delete metadata;
}
///////////
void TerrainMetadata::writeJsonToMBTiles(sqlite3 *db, const std::string &datasetName,
                                         const std::string &outputFormat,
                                         const std::string &profile,
                                         bool writeVertexNormals) const {
  std::stringstream ss;
  ss << "{\n";
  ss << "  \"tilejson\": \"2.1.0\",\n";
  // ... 나머지 내용 동일
  ss << "}\n";

  std::string json = ss.str();

  // metadata 테이블에 저장
  const char *sql = "INSERT OR REPLACE INTO metadata (name, value) VALUES (?, ?);";
  sqlite3_stmt *stmt;
  sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr);
  sqlite3_bind_text(stmt, 1, "layer.json", -1, SQLITE_STATIC);
  sqlite3_bind_text(stmt, 2, json.c_str(), -1, SQLITE_STATIC);
  sqlite3_step(stmt);
  sqlite3_finalize(stmt);
}
/////
void writeMBTilesMetadata(sqlite3 *db,
                          const std::string &datasetName,
                          const std::string &outputFormat = "Mesh",
                          const std::string &profile = "geodetic",
                          bool writeVertexNormals = false) const {

  std::ostringstream ss;
  ss << "{\n";
  ss << "  \"tilejson\": \"2.1.0\",\n";
  ss << "  \"name\": \"" << datasetName << "\",\n";
  ss << "  \"description\": \"\",\n";
  ss << "  \"version\": \"1.1.0\",\n";

  if      (outputFormat == "Terrain") ss << "  \"format\": \"heightmap-1.0\",\n";
  else if (outputFormat == "Mesh")    ss << "  \"format\": \"quantized-mesh-1.0\",\n";
  else                                ss << "  \"format\": \"GDAL\",\n";

  ss << "  \"attribution\": \"\",\n";
  ss << "  \"schema\": \"tms\",\n";

  if (writeVertexNormals)
    ss << "  \"extensions\": [ \"octvertexnormals\" ],\n";

  ss << "  \"tiles\": [ \"{z}/{x}/{y}.terrain?v={version}\" ],\n";
  ss << "  \"projection\": \"" << (profile == "geodetic" ? "EPSG:4326" : "EPSG:3857") << "\",\n";
  ss << "  \"bounds\": [ "
     << bounds.getMinX() << ", " << bounds.getMinY() << ", "
     << bounds.getMaxX() << ", " << bounds.getMaxY() << " ],\n";

  ss << "  \"available\": [\n";
  for (size_t i = 0, icount = levels.size(); i < icount; i++) {
    const LevelInfo &level = levels[i];
    ss << (i > 0 ? "   ,[ " : "    [ ");
    if (level.finalX >= level.startX) {
      ss << "{ \"startX\": " << level.startX
         << ", \"startY\": " << level.startY
         << ", \"endX\": "   << level.finalX
         << ", \"endY\": "   << level.finalY << " }";
    }
    ss << " ]\n";
  }
  ss << "  ]\n}\n";

  const std::string jsonStr = ss.str();

  // ── MBTiles metadata 테이블에 INSERT ──────────────
  auto exec = [&](const char *name, const std::string &value) {
    sqlite3_stmt *stmt;
    sqlite3_prepare_v2(db,
      "INSERT OR REPLACE INTO metadata (name, value) VALUES (?, ?);",
      -1, &stmt, nullptr);
    sqlite3_bind_text(stmt, 1, name,           -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, value.c_str(),  -1, SQLITE_TRANSIENT);
    sqlite3_step(stmt);
    sqlite3_finalize(stmt);
  };

  exec("name",   datasetName);
  exec("format", outputFormat == "Mesh" ? "quantized-mesh-1.0" : "heightmap-1.0");
  exec("bounds", std::to_string(bounds.getMinX()) + "," +
                 std::to_string(bounds.getMinY()) + "," +
                 std::to_string(bounds.getMaxX()) + "," +
                 std::to_string(bounds.getMaxY()));
  exec("minzoom", std::to_string(0));
  exec("maxzoom", std::to_string((int)levels.size() - 1));
  exec("type",    "overlay");
  exec("version", "1.1.0");
  exec("json",    jsonStr);   // layer.json 전체 내용
}

호출 위치 — main() 마지막 부분
// 기존: writeJsonFile → 파일 저장
if (metadata) {
  if (command.useMbtiles()) {
    // MBTiles 모드: DB에 저장
    metadata->writeMBTilesMetadata(
      mbtiles_db,
      datasetName,
      std::string(command.outputFormat),
      std::string(command.profile),
      command.vertexNormals
    );
  } else {
    // 파일 모드: 기존 그대로
    metadata->writeJsonFile(
      layerJsonPath, datasetName,
      std::string(command.outputFormat),
      std::string(command.profile),
      command.vertexNormals
    );
  }
  delete metadata;
}
////////


void serializeTile(MeshTile *tile, bool writeVertexNormals = false) override {
    const TileCoordinate &coord = tile->getCoordinate();

    ctb::CTBZMemOutputStream mem_stream(Z_BEST_SPEED);  // 또는 Z_DEFAULT_COMPRESSION, Z_BEST_COMPRESSION

    tile->writeFile(mem_stream, writeVertexNormals);

    mem_stream.close();

    auto compressed = mem_stream.takeCompressedData();

    if (!compressed.empty()) {
        insertTileMBTiles(coord.zoom, coord.x, coord.y,
                          compressed.data(),
                          static_cast<int>(compressed.size()));
    }

}

void serializeTile(MeshTile *tile, bool writeVertexNormals = false) override {
  const TileCoordinate &coord = tile->getCoordinate();

  ostringstream vpath_ss;
  vpath_ss << "/vsimem/mesh_tile_"
           << std::hash<std::thread::id>{}(std::this_thread::get_id())
           << ".terrain";
  const string vpath = vpath_ss.str();

  // CTBZFileOutputStream(gzopen) 대신 VSImem 스트림 사용
  {
    CTBVSIMemGZOutputStream stream(vpath.c_str());
    tile->writeFile(stream, writeVertexNormals);  // ← 오버로드 직접 호출
    stream.close();
  } // 소멸자에서 close() 자동 호출되지만 명시적으로 먼저 호출

  // /vsimem/ 에서 blob 읽기 → MBTiles INSERT
  vsi_l_offset fileLen = 0;
  GByte *data = VSIGetMemFileBuffer(vpath.c_str(), &fileLen, FALSE);

  if (data && fileLen > 0) {
    insertTileMBTiles(coord.zoom, coord.x, coord.y, data, (int)fileLen);
  }

  VSIUnlink(vpath.c_str());
}
