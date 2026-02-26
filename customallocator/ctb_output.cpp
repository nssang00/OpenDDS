/// MBTiles metadata 테이블에 layer.json 내용을 저장
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
