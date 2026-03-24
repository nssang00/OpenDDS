#include <iostream>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <queue>
#include <vector>
#include <atomic>
#include <chrono>

// ─── 데이터 구조 ──────────────────────────────────────────────
struct TileCoordinate {
    int x, y, zoom;
};

struct TileItem {
    TileCoordinate coord;
    std::vector<char> data;
};

// ─── Thread-safe MPSC 큐 ──────────────────────────────────────
class TileQueue {
public:
    // 아이템을 큐에 넣는다 (여러 스레드에서 동시 호출 가능)
    void push(TileItem item) {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            queue_.push(std::move(item));
        }
        cv_.notify_one();          // 잠들어 있는 consumer 깨우기
    }

    // stop 신호를 보낸다 (모든 producer가 끝난 뒤 호출)
    void stop() {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            stopped_ = true;
        }
        cv_.notify_all();
    }

    // Consumer 스레드가 호출 — 아이템을 꺼낸다.
    // 반환값: false이면 종료 조건(큐 비었고 stop 호출됨)
    bool pop(TileItem& out) {
        std::unique_lock<std::mutex> lock(mutex_);

        // 큐가 비어있고 종료 신호도 없으면 대기
        cv_.wait(lock, [this] {
            return !queue_.empty() || stopped_;
        });

        if (!queue_.empty()) {
            out = std::move(queue_.front());
            queue_.pop();
            return true;
        }
        return false;   // stopped_ == true && 큐 빈 상태 → 종료
    }

private:
    std::queue<TileItem>    queue_;
    std::mutex              mutex_;
    std::condition_variable cv_;
    bool                    stopped_ = false;
};

// ─── Producer ────────────────────────────────────────────────
void producer(TileQueue& q, int id, int tile_count) {
    for (int i = 0; i < tile_count; ++i) {
        TileItem item;
        item.coord = { id * 100 + i, id * 100 + i, 15 };

        // 타일 데이터 시뮬레이션
        item.data.assign(64, static_cast<char>('A' + id));

        q.push(std::move(item));

        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
    std::cout << "[Producer " << id << "] done\n";
}

// ─── Consumer ────────────────────────────────────────────────
void consumer(TileQueue& q) {
    TileItem item;
    int count = 0;

    while (q.pop(item)) {
        // 실제 처리 로직 자리
        std::cout << "[Consumer] tile("
                  << item.coord.x << ","
                  << item.coord.y << ") z="
                  << item.coord.zoom
                  << " data_size=" << item.data.size()
                  << "\n";
        ++count;
    }

    std::cout << "[Consumer] finished. total=" << count << "\n";
}

// ─── main ─────────────────────────────────────────────────────
int main() {
    const int kProducers  = 4;
    const int kTilesEach  = 5;

    TileQueue queue;

    // Consumer 스레드 (1개)
    std::thread cons(consumer, std::ref(queue));

    // Producer 스레드 (여러 개)
    std::vector<std::thread> producers;
    producers.reserve(kProducers);
    for (int i = 0; i < kProducers; ++i) {
        producers.emplace_back(producer,
                               std::ref(queue), i, kTilesEach);
    }

    // 모든 producer 완료 대기
    for (auto& t : producers) {
        t.join();
    }

    // 큐에 stop 신호 → consumer가 드레인 후 종료
    queue.stop();

    cons.join();
    return 0;
}


//////////////////

#include <iostream>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <queue>
#include <vector>
#include <atomic>
#include <stdexcept>
#include <chrono>
#include <sqlite3.h>

// ─── 데이터 구조 ──────────────────────────────────────────────
struct TileCoordinate {
    int x, y, zoom;
};

struct TileItem {
    TileCoordinate coord;
    std::vector<char> data;
};

// ─── Thread-safe MPSC 큐 ──────────────────────────────────────
class TileQueue {
public:
    void push(TileItem item) {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            queue_.push(std::move(item));
        }
        cv_.notify_one();
    }

    void stop() {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            stopped_ = true;
        }
        cv_.notify_all();
    }

    bool pop(TileItem& out) {
        std::unique_lock<std::mutex> lock(mutex_);
        cv_.wait(lock, [this] {
            return !queue_.empty() || stopped_;
        });
        if (!queue_.empty()) {
            out = std::move(queue_.front());
            queue_.pop();
            return true;
        }
        return false;
    }

private:
    std::queue<TileItem>    queue_;
    std::mutex              mutex_;
    std::condition_variable cv_;
    bool                    stopped_ = false;
};

// ─── MBTiles Writer ───────────────────────────────────────────
class MBTilesWriter {
public:
    static constexpr int COMMIT_INTERVAL = 5000;

    explicit MBTilesWriter(const std::string& path) {
        check(sqlite3_open(path.c_str(), &db_), "open");

        // WAL 모드: 쓰기 성능 향상
        exec("PRAGMA journal_mode=WAL;");
        exec("PRAGMA synchronous=NORMAL;");

        // MBTiles 스펙 테이블 생성
        exec(R"(
            CREATE TABLE IF NOT EXISTS metadata (
                name  TEXT NOT NULL,
                value TEXT NOT NULL
            );
        )");
        exec(R"(
            CREATE TABLE IF NOT EXISTS tiles (
                zoom_level  INTEGER NOT NULL,
                tile_column INTEGER NOT NULL,
                tile_row    INTEGER NOT NULL,
                tile_data   BLOB    NOT NULL,
                PRIMARY KEY (zoom_level, tile_column, tile_row)
            );
        )");

        // 기본 메타데이터 삽입 (없으면)
        exec(R"(
            INSERT OR IGNORE INTO metadata(name, value) VALUES
                ('name',    'Generated'),
                ('type',    'overlay'),
                ('version', '1.1'),
                ('format',  'pbf');
        )");

        // Prepared statement 준비
        const char* sql =
            "INSERT OR REPLACE INTO tiles"
            "(zoom_level, tile_column, tile_row, tile_data)"
            " VALUES (?, ?, ?, ?);";
        check(sqlite3_prepare_v2(db_, sql, -1, &stmt_, nullptr), "prepare");

        beginTransaction();
    }

    ~MBTilesWriter() {
        // 미커밋 잔여분 처리
        if (pending_ > 0) {
            commit();
        }
        sqlite3_finalize(stmt_);
        sqlite3_close(db_);
    }

    // MBTiles 좌표계: tile_row는 TMS 방식 (Y축 반전)
    // XYZ → TMS: tms_y = (1 << zoom) - 1 - y
    void insert(const TileItem& item) {
        const auto& c = item.coord;
        int tms_y = (1 << c.zoom) - 1 - c.y;

        sqlite3_bind_int (stmt_, 1, c.zoom);
        sqlite3_bind_int (stmt_, 2, c.x);
        sqlite3_bind_int (stmt_, 3, tms_y);
        sqlite3_bind_blob(stmt_, 4,
                          item.data.data(),
                          static_cast<int>(item.data.size()),
                          SQLITE_STATIC);   // 데이터는 step 전까지 유효

        check(sqlite3_step(stmt_), "step", SQLITE_DONE);
        sqlite3_reset(stmt_);

        ++pending_;
        ++total_;

        if (pending_ >= COMMIT_INTERVAL) {
            commit();
            beginTransaction();
        }
    }

    int total() const { return total_; }

private:
    void beginTransaction() {
        exec("BEGIN TRANSACTION;");
        pending_ = 0;
    }

    void commit() {
        exec("COMMIT;");
        std::cout << "[MBTilesWriter] committed "
                  << pending_ << " tiles"
                  << " (total=" << total_ << ")\n";
    }

    void exec(const char* sql) {
        char* err = nullptr;
        int rc = sqlite3_exec(db_, sql, nullptr, nullptr, &err);
        if (rc != SQLITE_OK) {
            std::string msg = err ? err : "unknown";
            sqlite3_free(err);
            throw std::runtime_error(
                std::string("SQLite exec failed: ") + msg);
        }
    }

    void check(int rc, const char* ctx,
               int expected = SQLITE_OK) const {
        if (rc != expected) {
            throw std::runtime_error(
                std::string("SQLite error [") + ctx + "]: "
                + sqlite3_errmsg(db_));
        }
    }

    sqlite3*      db_      = nullptr;
    sqlite3_stmt* stmt_    = nullptr;
    int           pending_ = 0;
    int           total_   = 0;
};

// ─── Consumer (단일 스레드) ───────────────────────────────────
void consumer(TileQueue& q, const std::string& db_path) {
    try {
        MBTilesWriter writer(db_path);
        TileItem item;

        while (q.pop(item)) {
            writer.insert(item);
        }

        // 루프 탈출 후 잔여 commit은 writer 소멸자가 처리

        std::cout << "[Consumer] done. total tiles="
                  << writer.total() << "\n";

    } catch (const std::exception& e) {
        std::cerr << "[Consumer] ERROR: " << e.what() << "\n";
    }
}

// ─── Producer ────────────────────────────────────────────────
void producer(TileQueue& q, int id, int tile_count) {
    for (int i = 0; i < tile_count; ++i) {
        TileItem item;
        item.coord = { id * 100 + i, id * 100 + i, 14 };
        item.data.assign(512, static_cast<char>('A' + id));
        q.push(std::move(item));
    }
    std::cout << "[Producer " << id << "] pushed "
              << tile_count << " tiles\n";
}

// ─── main ─────────────────────────────────────────────────────
int main() {
    const int kProducers = 4;
    const int kTilesEach = 3000;   // 총 12,000개 → 2번 commit + 잔여 1회

    TileQueue queue;

    std::thread cons(consumer, std::ref(queue), "output.mbtiles");

    std::vector<std::thread> producers;
    for (int i = 0; i < kProducers; ++i) {
        producers.emplace_back(producer,
                               std::ref(queue), i, kTilesEach);
    }

    for (auto& t : producers) t.join();
    queue.stop();
    cons.join();

    return 0;
}
