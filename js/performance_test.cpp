#include <iostream>
#include <future>
#include <vector>
#include <chrono>

void testFunction() {
    // 간단한 작업, 예: 100ms 대기
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
}

int main() {
    const int numTasks = 100; // 실행할 작업 수
    std::vector<std::future<void>> futures;

    auto start = std::chrono::steady_clock::now();

    // 1초 동안 최대한 많은 작업을 실행
    for (int i = 0; i < numTasks; ++i) {
        futures.push_back(std::async(std::launch::async, testFunction));
    }

    auto end = std::chrono::steady_clock::now();
    std::chrono::duration<double> elapsed_seconds = end - start;

    std::cout << "Total tasks launched: " << numTasks << std::endl;
    std::cout << "Time taken to launch tasks: " << elapsed_seconds.count() << " seconds" << std::endl;
    std::cout << "Tasks launched per second: " << numTasks / elapsed_seconds.count() << std::endl;

    return 0;
}
