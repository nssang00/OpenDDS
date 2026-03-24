#include <iostream>
#include <vector>
#include <queue>
#include <mutex>
#include <condition_variable>
#include <thread>
#include <sqlite3.h> // mbtiles 처리를 위한 sqlite3

// 좌표 데이터 구조체
struct TileCoordinate {
    int z, x, y;
};

// 큐에 담길 데이터 유닛
struct TileData {
    TileCoordinate coord;
    std::vector<char> blob;
};

class TileQueue {
private:
    std::queue<TileData> queue;
    std::mutex mtx;
    std::condition_variable cv;
    bool finished = false;

public:
    // Multi-Producer: 여러 스레드에서 호출 가능
    void push(TileData&& data) {
        {
            std::lock_guard<std::mutex> lock(mtx);
            queue.push(std::move(lock));
        }
        cv.notify_one();
    }

    // Consumer 종료 신호
    void set_finished() {
        {
            std::lock_guard<std::mutex> lock(mtx);
            finished = true;
        }
        cv.notify_all();
    }

    // Single-Consumer: 한 스레드에서 데이터 추출
    bool pop(TileData& data) {
        std::unique_lock<std::mutex> lock(mtx);
        cv.wait(lock, [this] { return !queue.empty() || finished; });
        
        if (queue.empty()) return false;

        data = std::move(queue.front());
        queue.pop();
        return true;
    }
};

// Consumer 함수: mbtiles(SQLite)에 저장
void consumer_task(TileQueue& tq, sqlite3* db) {
    const int BATCH_SIZE = 5000;
    int count = 0;
    TileData data;

    // 초기 트랜잭션 시작
    sqlite3_exec(db, "BEGIN TRANSACTION;", nullptr, nullptr, nullptr);

    sqlite3_stmt* stmt;
    const char* sql = "INSERT INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES (?, ?, ?, ?);";
    sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr);

    while (tq.pop(data)) {
        // SQL 파라미터 바인딩
        sqlite3_bind_int(stmt, 1, data.coord.z);
        sqlite3_bind_int(stmt, 2, data.coord.x);
        sqlite3_bind_int(stmt, 3, data.coord.y);
        sqlite3_bind_blob(stmt, 4, data.blob.data(), data.blob.size(), SQLITE_TRANSIENT);

        sqlite3_step(stmt);
        sqlite3_reset(stmt);
        
        count++;

        // 5000개마다 커밋 후 재시작
        if (count % BATCH_SIZE == 0) {
            sqlite3_exec(db, "COMMIT;", nullptr, nullptr, nullptr);
            sqlite3_exec(db, "BEGIN TRANSACTION;", nullptr, nullptr, nullptr);
            std::cout << "[Consumer] Committed " << count << " tiles..." << std::endl;
        }
    }

    // 잔여 데이터 커밋 및 종료
    sqlite3_exec(db, "COMMIT;", nullptr, nullptr, nullptr);
    sqlite3_finalize(stmt);
    std::cout << "[Consumer] Total " << count << " tiles processed." << std::endl;
}
