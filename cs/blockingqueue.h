```cpp
class BlockingQueue {
public:
    void push(TileWriteData item) {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            queue_.push(std::move(item));
        }
        cv_.notify_one();
    }

    bool pop(TileWriteData& item) {
        std::unique_lock<std::mutex> lock(mutex_);
        cv_.wait(lock, [this] {
            return !queue_.empty() || closed_;
        });

        if (queue_.empty() && closed_) return false;

        item = std::move(queue_.front());
        queue_.pop();
        return true;
    }

    void close() {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            closed_ = true;
        }
        cv_.notify_all();
    }

private:
    std::queue<TileWriteData> queue_;
    std::mutex mutex_;
    std::condition_variable cv_;
    bool closed_ = false;
};
```
class MBTilesWriter {
public:
    MBTilesWriter(sqlite3* db) : db_(db) {
        // Writer 스레드 생성
        writerThread_ = std::thread(&MBTilesWriter::writerThread, this);
    }

    ~MBTilesWriter() {
        queue_.close();
        writerThread_.join();
    }

    // 기존 Worker 스레드에서 호출
    void push(ctb::TileCoordinate coord, std::vector<char> buffer) {
        TileWriteData data;
        data.coord = coord;
        data.buffer = std::move(buffer);
        queue_.push(std::move(data));
    }

private:
    void writerThread() {
        TileWriteData data;
        int count = 0;

        while (queue_.pop(data)) {
            insertTileMBTiles(db_,
                              data.coord.zoom,
                              data.coord.x,
                              data.coord.y,
                              data.buffer.data(),
                              data.buffer.size());
            count++;

            if (count % 50000 == 0) {
                sqlite3_exec(db_, "COMMIT", nullptr, nullptr, nullptr);
                sqlite3_exec(db_, "BEGIN", nullptr, nullptr, nullptr);
                count = 0;
            }
        }
        sqlite3_exec(db_, "COMMIT", nullptr, nullptr, nullptr);  // 마지막 commit
    }

    sqlite3* db_;
    BlockingQueue queue_;
    std::thread writerThread_;
};

/////////
void processBlock() {
    while (auto block = getNextBlock()) {
        for (auto& coord : block) {
            MeshTile tile;
            CTBZMemOutputStream mem_stream;
            tile->writeFile(mem_stream);

            writer_.push(coord, std::move(mem_stream.buffer_));  // 추가
        }
    }
}


void run() {
    MBTilesWriter writer(db);

    std::vector<std::thread> workers;
    for (int i = 0; i < 20; i++)
        workers.emplace_back(&processBlock);

    for (auto& w : workers) w.join();
    // writer는 소멸자에서 자동으로 join
}

`TileWriteData`와 같은 파일에 있으니 헤더 의존성도 따로 신경 쓸 필요 없어서 더 단순해집니다.
