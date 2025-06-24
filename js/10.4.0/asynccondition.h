#include <condition_variable>
#include <mutex>
#include <chrono>

class AsyncCondition {
public:
    void wait(int milliseconds) {
        std::unique_lock<std::mutex> lock(mutex_);
        condition_.wait_for(lock, std::chrono::milliseconds(milliseconds), [this] {
            return notified_;
        });
        notified_ = false; // auto-reset
    }

    void notify() {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            notified_ = true;
        }
        condition_.notify_one();
    }

private:
    std::mutex mutex_;
    std::condition_variable condition_;
    bool notified_ = false;
};
