int main() {
    TileQueue queue;

    // Consumer thread (람다)
    std::thread consumerThread([&queue]() {
        MBTilesWriter writer("tiles.mbtiles");

        TileData tile;
        int count = 0;

        while (queue.pop(tile)) {
            writer.insert(tile);

            if (++count % 5000 == 0) {
                writer.commit();
            }
        }

        writer.commit(); // 마지막 flush
    });

    // Producer threads
    std::vector<std::thread> producers;

    for (int i = 0; i < 4; ++i) {
        producers.emplace_back([&queue, i]() {
            for (int j = 0; j < 10000; ++j) {
                TileData tile;
                tile.coord = {10, i * 10000 + j, j};
                tile.tileData = std::vector<char>(256, 'a');

                queue.push(std::move(tile));
            }
        });
    }

    for (auto& t : producers) {
        t.join();
    }

    queue.close();        // 생산 종료
    consumerThread.join(); // consumer 종료

    return 0;
}
/////////////////////

#include <queue>
#include <mutex>
#include <condition_variable>

class ThreadSafeQueue {
public:
    void push(TileData&& item) {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            queue_.push(std::move(item));
        }
        cond_.notify_one();
    }

    bool pop(TileData& item) {
        std::unique_lock<std::mutex> lock(mutex_);
        cond_.wait(lock, [this]() {
            return !queue_.empty() || finished_;
        });

        if (queue_.empty())
            return false;

        item = std::move(queue_.front());
        queue_.pop();
        return true;
    }

    void setFinished() {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            finished_ = true;
        }
        cond_.notify_all();
    }

private:
    std::queue<TileData> queue_;
    std::mutex mutex_;
    std::condition_variable cond_;
    bool finished_ = false;
};

#include <sqlite3.h>
#include <iostream>

#include <thread>

void producer(ThreadSafeQueue& queue, int start, int end) {
    for (int i = start; i < end; ++i) {
        TileData tile;

        tile.coord = {10, i, i};  // 예시
        tile.data = std::vector<char>(256, 'a'); // 더미 데이터

        queue.push(std::move(tile));
    }
}

void consumer(ThreadSafeQueue& queue) {
    sqlite3* db;
    sqlite3_open("tiles.mbtiles", &db);

    char* errMsg = nullptr;

    sqlite3_exec(db, "BEGIN;", nullptr, nullptr, &errMsg);

    int count = 0;
    TileData item;

    while (queue.pop(item)) {
        sqlite3_stmt* stmt;

        const char* sql = 
            "INSERT INTO tiles (zoom_level, tile_column, tile_row, tile_data) "
            "VALUES (?, ?, ?, ?);";

        sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr);

        sqlite3_bind_int(stmt, 1, item.coord.z);
        sqlite3_bind_int(stmt, 2, item.coord.x);
        sqlite3_bind_int(stmt, 3, item.coord.y);
        sqlite3_bind_blob(stmt, 4, item.data.data(), item.data.size(), SQLITE_TRANSIENT);

        if (sqlite3_step(stmt) != SQLITE_DONE) {
            std::cerr << "Insert failed\n";
        }

        sqlite3_finalize(stmt);

        count++;

        if (count % 5000 == 0) {
            sqlite3_exec(db, "COMMIT;", nullptr, nullptr, &errMsg);
            sqlite3_exec(db, "BEGIN;", nullptr, nullptr, &errMsg);
            std::cout << "Committed: " << count << std::endl;
        }
    }

    sqlite3_exec(db, "COMMIT;", nullptr, nullptr, &errMsg);
    sqlite3_close(db);
}

#include <vector>

int main() {
    ThreadSafeQueue queue;

    // Consumer thread
    std::thread consumerThread(consumer, std::ref(queue));

    // Producer threads
    std::vector<std::thread> producers;
    int numProducers = 4;

    for (int i = 0; i < numProducers; ++i) {
        producers.emplace_back(producer, std::ref(queue), i * 10000, (i + 1) * 10000);
    }

    for (auto& t : producers) {
        t.join();
    }

    // 생산 종료 알림
    queue.setFinished();

    consumerThread.join();

    return 0;
}
