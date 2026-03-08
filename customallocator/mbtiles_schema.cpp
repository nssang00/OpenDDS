void createMBTiles(const std::string& path) {
    sqlite3* db = nullptr;
    
    if (sqlite3_open(path.c_str(), &db) != SQLITE_OK) {
        throw std::runtime_error(sqlite3_errmsg(db));
    }

    const char* sql = R"(
        CREATE TABLE IF NOT EXISTS tiles (
            zoom_level  INTEGER,
            tile_column INTEGER,
            tile_row    INTEGER,
            tile_data   BLOB
        );

        CREATE TABLE IF NOT EXISTS metadata (
            name  TEXT,
            value TEXT
        );

        CREATE UNIQUE INDEX IF NOT EXISTS tile_index
            ON tiles (zoom_level, tile_column, tile_row);
    )";

    char* errMsg = nullptr;
    if (sqlite3_exec(db, sql, nullptr, nullptr, &errMsg) != SQLITE_OK) {
        std::string err(errMsg);
        sqlite3_free(errMsg);
        sqlite3_close(db);
        throw std::runtime_error(err);
    }

    sqlite3_close(db);
}


///////
#include <iostream>
#include <sqlite3.h>
#include <string>

int create_mbtiles_schema(const std::string& filename) {
    sqlite3* db;
    char* zErrMsg = 0;
    int rc;

    // 1. 데이터베이스 파일 생성/열기
    rc = sqlite3_open(filename.c_str(), &db);
    if (rc) {
        std::cerr << "파일을 열 수 없습니다: " << sqlite3_errmsg(db) << std::endl;
        return rc;
    }

    // 2. SQL 스키마 정의
    // - metadata: 지도의 이름, 포맷, 범위(bounds) 등 저장
    // - tiles: 실제 타일 데이터(blob) 저장
    const char* sql = 
        "CREATE TABLE metadata (name TEXT, value TEXT);"
        "CREATE TABLE tiles (zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER, tile_data BLOB);"
        
        // 검색 속도를 위한 인덱스 생성 (필수)
        "CREATE UNIQUE INDEX tile_index ON tiles (zoom_level, tile_column, tile_row);"
        
        // 선택 사항: 특정 뷰(View) 생성 (일부 도구 호환성용)
        "CREATE VIEW images AS SELECT tile_data AS grid_tile, zoom_level, tile_column, tile_row FROM tiles;"
        "CREATE VIEW grid_key AS SELECT zoom_level, tile_column, tile_row, '' as grid_id FROM tiles;";

    // 3. SQL 실행
    rc = sqlite3_exec(db, sql, NULL, 0, &zErrMsg);

    if (rc != SQLITE_OK) {
        std::cerr << "SQL 오류: " << zErrMsg << std::endl;
        sqlite3_free(zErrMsg);
    } else {
        std::cout << "MBTiles 스키마가 성공적으로 생성되었습니다: " << filename << std::endl;
    }

    // 4. 연결 닫기
    sqlite3_close(db);
    return rc;
}

int main() {
    create_mbtiles_schema("my_map.mbtiles");
    return 0;
}
