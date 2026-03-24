#include <iostream>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <queue>
#include <vector>
#include <atomic>
#include <chrono>
#include <random>
#include <sqlite3.h>

// 타일 좌표 (Zoom, X, Y)
struct TileCoordinate {
    int z;
    int x;
    int y;
};

// 큐에 저장될 아이템: 좌표 + 데이터
struct QueueItem {
    TileCoordinate coord;
    std::vector<char> data;
};

// 여러 생산자와 한 소비자를 위한 스레드 안전 큐
class ThreadSafeQueue {
public:
    void push(QueueItem item) {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            queue_.push(std::move(item));
        }
        cv_.notify_one();
    }

    // pop: 큐가 비어있으면 대기, shutdown이 true이고 큐가 비면 false 반환
    bool pop(QueueItem& item) {
        std::unique_lock<std::mutex> lock(mutex_);
        cv_.wait(lock, [this] { return !queue_.empty() || shutdown_; });
        if (queue_.empty()) {
            return false;   // shutdown && empty
        }
        item = std::move(queue_.front());
        queue_.pop();
        return true;
    }

    void shutdown() {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            shutdown_ = true;
        }
        cv_.notify_all();
    }

private:
    std::queue<QueueItem> queue_;
    std::mutex mutex_;
    std::condition_variable cv_;
    bool shutdown_ = false;
};

// MBTiles 데이터베이스에 insert 및 commit 관리
class MBTilesWriter {
public:
    MBTilesWriter(const std::string& filename) : db_(nullptr), insert_stmt_(nullptr), counter_(0) {
        int rc = sqlite3_open(filename.c_str(), &db_);
        if (rc != SQLITE_OK) {
            throw std::runtime_error("Failed to open database: " + std::string(sqlite3_errmsg(db_)));
        }

        // MBTiles 스키마: tiles 테이블 생성 (존재하지 않을 경우)
        const char* create_sql = R"(
            CREATE TABLE IF NOT EXISTS tiles (
                zoom_level INTEGER,
                tile_column INTEGER,
                tile_row INTEGER,
                tile_data BLOB,
                PRIMARY KEY (zoom_level, tile_column, tile_row)
            );
        )";
        rc = sqlite3_exec(db_, create_sql, nullptr, nullptr, nullptr);
        if (rc != SQLITE_OK) {
            throw std::runtime_error("Failed to create table: " + std::string(sqlite3_errmsg(db_)));
        }

        // insert 준비
        const char* insert_sql = "INSERT OR REPLACE INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES (?, ?, ?, ?);";
        rc = sqlite3_prepare_v2(db_, insert_sql, -1, &insert_stmt_, nullptr);
        if (rc != SQLITE_OK) {
            throw std::runtime_error("Failed to prepare insert: " + std::string(sqlite3_errmsg(db_)));
        }

        // 트랜잭션 시작
        beginTransaction();
    }

    ~MBTilesWriter() {
        if (counter_ > 0) {
            commitTransaction();  // 남은 데이터 commit
        }
        if (insert_stmt_) sqlite3_finalize(insert_stmt_);
        if (db_) sqlite3_close(db_);
    }

    // 타일 insert (thread-safe하지 않음: 한 스레드만 사용)
    void insert(const TileCoordinate& coord, const std::vector<char>& data) {
        // MBTiles는 TMS y 좌표를 사용: tms_y = (1 << z) - 1 - y
        int tms_y = (1 << coord.z) - 1 - coord.y;

        sqlite3_bind_int(insert_stmt_, 1, coord.z);
        sqlite3_bind_int(insert_stmt_, 2, coord.x);
        sqlite3_bind_int(insert_stmt_, 3, tms_y);
        sqlite3_bind_blob(insert_stmt_, 4, data.data(), static_cast<int>(data.size()), SQLITE_STATIC);

        int rc = sqlite3_step(insert_stmt_);
        if (rc != SQLITE_DONE) {
            std::cerr << "SQLite insert error: " << sqlite3_errmsg(db_) << std::endl;
        }
        sqlite3_reset(insert_stmt_);

        counter_++;
        if (counter_ >= 5000) {
            commitTransaction();
            beginTransaction();
            counter_ = 0;
        }
    }

private:
    void beginTransaction() {
        sqlite3_exec(db_, "BEGIN TRANSACTION;", nullptr, nullptr, nullptr);
    }

    void commitTransaction() {
        sqlite3_exec(db_, "COMMIT;", nullptr, nullptr, nullptr);
    }

    sqlite3* db_;
    sqlite3_stmt* insert_stmt_;
    int counter_;  // 현재 트랜잭션에서 insert한 개수
};

// 소비자 스레드 함수
void consumer(ThreadSafeQueue& queue, MBTilesWriter& writer) {
    QueueItem item;
    while (queue.pop(item)) {
        writer.insert(item.coord, item.data);
    }
    std::cout << "Consumer finished." << std::endl;
}

// 생산자 스레드 함수: 더미 데이터 생성
void producer(ThreadSafeQueue& queue, int id, int num_items) {
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<int> zoom_dist(0, 10);
    std::uniform_int_distribution<int> tile_dist(0, 1000);
    std::uniform_int_distribution<int> data_size_dist(100, 500);

    for (int i = 0; i < num_items; ++i) {
        QueueItem item;
        item.coord = {zoom_dist(gen), tile_dist(gen), tile_dist(gen)};
        int size = data_size_dist(gen);
        item.data.assign(size, static_cast<char>(i % 256));  // 더미 데이터
        queue.push(std::move(item));
    }
    std::cout << "Producer " << id << " finished." << std::endl;
}

int main() {
    try {
        ThreadSafeQueue queue;
        MBTilesWriter writer("output.mbtiles");

        // 생산자 스레드 시작
        const int num_producers = 4;
        const int items_per_producer = 1000;
        std::vector<std::thread> producers;
        for (int i = 0; i < num_producers; ++i) {
            producers.emplace_back(producer, std::ref(queue), i, items_per_producer);
        }

        // 소비자 스레드 시작
        std::thread consumer_thread(consumer, std::ref(queue), std::ref(writer));

        // 모든 생산자가 종료될 때까지 대기
        for (auto& t : producers) {
            t.join();
        }

        // 큐에 더 이상 데이터가 들어오지 않음을 알림
        queue.shutdown();
        consumer_thread.join();

        std::cout << "All done." << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    return 0;
}
