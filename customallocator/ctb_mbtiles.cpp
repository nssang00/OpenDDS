// ── TerrainBuild 클래스 ──────────────────────────────
class TerrainBuild : public Command {
public:
  TerrainBuild(...) :
    outputMbtiles(nullptr), ... {}

  // 사용자 방식: nullptr 체크로 간결하게
  bool useMbtiles() const {
    return outputMbtiles != nullptr && strlen(outputMbtiles) > 0;
  }

  static void setOutputMbtiles(command_t *command) {
    static_cast<TerrainBuild *>(Command::self(command))->outputMbtiles = command->arg;
  }

  const char *outputMbtiles;
  // ... 기존 멤버들
};
// ── MBTiles 헬퍼 (전역) ────────────────────────────
static sqlite3 *mbtiles_db = nullptr;
static std::mutex mbtilesMutex;

// Y축 반전 (TMS → MBTiles 스펙)
static int flipY(int y, int zoom) {
  return (1 << zoom) - 1 - y;
}

static void initMBTiles(const char *path) {
  if (sqlite3_open(path, &mbtiles_db) != SQLITE_OK) {
    throw CTBException("Cannot open MBTiles file");
  }

  const char *sqls[] = {
    "PRAGMA journal_mode=WAL;",   // 멀티스레드 성능 향상 ← 핵심 추가
    "CREATE TABLE IF NOT EXISTS tiles ("
    "  zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER,"
    "  tile_data BLOB, PRIMARY KEY(zoom_level, tile_column, tile_row))",
    "CREATE TABLE IF NOT EXISTS metadata (name TEXT PRIMARY KEY, value TEXT)",
    nullptr
  };

  for (int i = 0; sqls[i]; ++i) {
    char *err = nullptr;
    sqlite3_exec(mbtiles_db, sqls[i], nullptr, nullptr, &err);
    if (err) {
      string msg = string("MBTiles init error: ") + err;
      sqlite3_free(err);
      throw CTBException(msg.c_str());
    }
  }
}

// 내 방식의 mutex + 사용자 방식의 직접 blob 바인딩
static void insertTile(int z, int x, int y, const void *data, int len) {
  std::lock_guard<std::mutex> lock(mbtilesMutex); // ← 멀티스레드 필수

  sqlite3_stmt *stmt;
  sqlite3_prepare_v2(mbtiles_db,
    "INSERT OR REPLACE INTO tiles VALUES (?,?,?,?)", -1, &stmt, nullptr);
  sqlite3_bind_int(stmt, 1, z);
  sqlite3_bind_int(stmt, 2, x);
  sqlite3_bind_int(stmt, 3, flipY(y, z));
  sqlite3_bind_blob(stmt, 4, data, len, SQLITE_STATIC);
  sqlite3_step(stmt);
  sqlite3_finalize(stmt);
}
// ── buildTerrain() ──────────────────────────────────
static void buildTerrain(const TerrainTiler &tiler, TerrainBuild *command) {
  const string dirname = string(command->outputDir) + osDirSep;
  i_zoom startZoom = (command->startZoom < 0) ? tiler.maxZoomLevel() : command->startZoom,
         endZoom   = (command->endZoom < 0)   ? 0 : command->endZoom;

  TerrainIterator iter(tiler, startZoom, endZoom);
  int currentIndex = incrementIterator(iter, 0);
  setIteratorSize(iter);

  while (!iter.exhausted()) {
    const TileCoordinate *coord = iter.GridIterator::operator*();

    if (command->useMbtiles()) {
      // ── MBTiles 경로 (/vsimem으로 직렬화 후 INSERT) ──
      TerrainTile *tile = *iter;

      // 스레드별 고유 경로로 충돌 방지 (내 방식 버그 수정)
      string vpath = concat("/vsimem/tile_",
                            (uint64_t)std::hash<std::thread::id>{}(std::this_thread::get_id()),
                            ".terrain");

      tile->writeFile(vpath.c_str());
      delete tile;

      vsi_l_offset fileLen;
      GByte *data = VSIGetMemFileBuffer(vpath.c_str(), &fileLen, FALSE);

      insertTile(coord->zoom, coord->x, coord->y, data, (int)fileLen);
      VSIUnlink(vpath.c_str());

      showProgress(currentIndex, vpath);

    } else {
      // ── 기존 파일 저장 경로 (원본 유지) ──
      const string filename = getTileFilename(coord, dirname, "terrain");
      if (!command->resume || !fileExists(filename)) {
        TerrainTile *tile = *iter;
        const string tmp = concat(filename, ".tmp");
        tile->writeFile(tmp.c_str());
        delete tile;
        if (VSIRename(tmp.c_str(), filename.c_str()) != 0)
          throw new CTBException("Could not rename temporary file");
      }
      showProgress(currentIndex, filename);
    }

    currentIndex = incrementIterator(iter, currentIndex);
  }
}
// ── main() 수정 부분 ────────────────────────────────

// 옵션 등록 (가장 먼저 추가)
command.option("-M", "--output-mbtiles <file>",
               "output to MBTiles file (overrides directory output)",
               TerrainBuild::setOutputMbtiles);

// 디렉토리 체크 조건 수정
if (!command.useMbtiles()) {
  VSIStatBufL stat;
  if (VSIStatExL(command.outputDir, &stat, ...)) {
    cerr << "Error: output directory does not exist" << endl;
    return 1;
  }
}

// DB 초기화
if (command.useMbtiles()) {
  try {
    initMBTiles(command.outputMbtiles);
  } catch (CTBException &e) {
    cerr << "Error: " << e.what() << endl;
    return 1;
  }
}

// ... 스레드 실행 ...

// 종료 시 정리
if (mbtiles_db) {
  sqlite3_exec(mbtiles_db, "ANALYZE;", nullptr, nullptr, nullptr); // 쿼리 최적화
  sqlite3_close(mbtiles_db);
}
