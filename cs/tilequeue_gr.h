#include <queue>
#include <mutex>
#include <condition_variable>
#include <thread>
#include <vector>
#include <string>
#include <atomic>
#include <iostream>
#include <sqlite3.h>

// TileCoordinate 객체 (사용자가 이미 정의한 객체가 있다면 아래 struct를 그 클래스로 교체하세요)
struct TileCoordinate {
    int zoom_level;   // zoom_level
    int tile_column;  // x
    int tile_row;     // y
};

using TileData = std::vector<char>;

struct TileItem {
    TileCoordinate coord;
    TileData data;
};

// Multi-Producer / Single-Consumer Thread-Safe Queue (C++11)
class TileQueue {
private:
    std::queue<TileItem> queue_;
    std::mutex mutex_;
    std::condition_variable cv_;
    std::atomic<bool> finished_{false};

public:
    // Producer들이 호출 (여러 스레드에서 동시에 push 가능)
    void push(TileItem item) {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            queue_.push(std::move(item));
        }
        cv_.notify_one();
    }

    // Consumer가 호출 (하나의 스레드만 pop)
    // 반환값: true = 아이템 꺼냄, false = finished && queue empty
    bool pop(TileItem& item) {
        std::unique_lock<std::mutex> lock(mutex_);
        cv_.wait(lock, [this]() { return !queue_.empty() || finished_; });

        if (queue_.empty() && finished_) {
            return false;
        }

        item = std::move(queue_.front());
        queue_.pop();
        return true;
    }

    // 모든 Producer 작업 완료 후 호출 (Consumer에게 종료 신호)
    void finish() {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            finished_ = true;
        }
        cv_.notify_all();
    }
};

// MBTiles Consumer (하나의 스레드에서만 실행)
class MBTilesConsumer {
private:
    TileQueue& queue_;
    sqlite3* db_ = nullptr;
    sqlite3_stmt* stmt_ = nullptr;
    const int commit_every_ = 5000;

public:
    explicit MBTilesConsumer(TileQueue& q, const std::string& db_path) : queue_(q) {
        if (sqlite3_open(db_path.c_str(), &db_) != SQLITE_OK) {
            std::cerr << "MBTiles DB open 실패: " << sqlite3_errmsg(db_) << std::endl;
            return;
        }

        // tiles 테이블이 없으면 생성 (MBTiles 표준 스키마)
        const char* create_table = R"(
            CREATE TABLE IF NOT EXISTS tiles (
                zoom_level INTEGER NOT NULL,
                tile_column INTEGER NOT NULL,
                tile_row INTEGER NOT NULL,
                tile_data BLOB NOT NULL,
                PRIMARY KEY (zoom_level, tile_column, tile_row)
            );
        )";
        sqlite3_exec(db_, create_table, nullptr, nullptr, nullptr);

        // INSERT 준비
        const char* insert_sql = 
            "INSERT INTO tiles (zoom_level, tile_column, tile_row, tile_data) "
            "VALUES (?, ?, ?, ?);";
        if (sqlite3_prepare_v2(db_, insert_sql, -1, &stmt_, nullptr) != SQLITE_OK) {
            std::cerr << "INSERT statement prepare 실패: " << sqlite3_errmsg(db_) << std::endl;
        }
    }

    \~MBTilesConsumer() {
        if (stmt_) sqlite3_finalize(stmt_);
        if (db_) sqlite3_close(db_);
    }

    // Consumer 메인 루프 (하나의 스레드에서만 호출)
    void run() {
        if (!db_ || !stmt_) return;

        sqlite3_exec(db_, "BEGIN;", nullptr, nullptr, nullptr);  // 트랜잭션 시작

        TileItem item;
        int count = 0;

        while (queue_.pop(item)) {
            // bind
            sqlite3_bind_int(stmt_, 1, item.coord.zoom_level);
            sqlite3_bind_int(stmt_, 2, item.coord.tile_column);
            sqlite3_bind_int(stmt_, 3, item.coord.tile_row);
            sqlite3_bind_blob(stmt_, 4, item.data.data(), static_cast<int>(item.data.size()), SQLITE_STATIC);

            if (sqlite3_step(stmt_) != SQLITE_DONE) {
                std::cerr << "INSERT 실패: " << sqlite3_errmsg(db_) << std::endl;
            }

            sqlite3_reset(stmt_);   // 재사용 준비

            ++count;

            if (count % commit_every_ == 0) {
                sqlite3_exec(db_, "COMMIT; BEGIN;", nullptr, nullptr, nullptr);
            }
        }

        // 마지막 잔여 데이터 COMMIT
        sqlite3_exec(db_, "COMMIT;", nullptr, nullptr, nullptr);
        std::cout << "MBTiles insert 완료: 총 " << count << " 개 타일" << std::endl;
    }
};

// 사용 예시 (main)
int main() {
    TileQueue queue;

    // Consumer 생성 (MBTiles 파일 경로)
    MBTilesConsumer consumer(queue, "output.mbtiles");

    // Consumer 전용 스레드 시작
    std::thread consumer_thread([&consumer]() {
        consumer.run();
    });

    // Multi Producer 예시 (5개 스레드)
    std::vector<std::thread> producers;
    for (int p = 0; p < 5; ++p) {
        producers.emplace_back([&queue, p]() {
            for (int i = 0; i < 2000; ++i) {  // 각 Producer당 2000개 타일 push
                TileCoordinate coord{p % 10, i, i};           // 예시 좌표
                std::vector<char> data(1024, static_cast<char>(i % 256)); // 예시 타일 데이터 (실제 PNG/JPG 등)

                queue.push({std::move(coord), std::move(data)});
            }
        });
    }

    // Producer들 모두 완료 대기
    for (auto& t : producers) {
        t.join();
    }

    // Producer 종료 신호 → Consumer가 자연스럽게 종료됨
    queue.finish();

    // Consumer 스레드 종료 대기
    consumer_thread.join();

    std::cout << "모든 작업 완료!" << std::endl;
    return 0;
}
