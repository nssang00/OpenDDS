#include <iostream>
#include <thread>
#include <mutex>
#include <windows.h>
#include <chrono>

const int NUM_ITERATIONS = 1000000;  // 반복 횟수
int shared_value_mutex = 0;
int shared_value_createMutex = 0;
int shared_value_criticalSection = 0;

// 1. std::mutex
std::mutex mtx;
void incrementWithStdMutex() {
    for (int i = 0; i < NUM_ITERATIONS; ++i) {
        std::lock_guard<std::mutex> lock(mtx);
        ++shared_value_mutex;
    }
}

// 2. CreateMutex
HANDLE hMutex = CreateMutex(NULL, FALSE, NULL);
void incrementWithCreateMutex() {
    for (int i = 0; i < NUM_ITERATIONS; ++i) {
        WaitForSingleObject(hMutex, INFINITE);  // Mutex 잠금
        ++shared_value_createMutex;
        ReleaseMutex(hMutex);  // Mutex 해제
    }
}

// 3. CRITICAL_SECTION
CRITICAL_SECTION criticalSection;
void incrementWithCriticalSection() {
    for (int i = 0; i < NUM_ITERATIONS; ++i) {
        EnterCriticalSection(&criticalSection);  // CRITICAL_SECTION 잠금
        ++shared_value_criticalSection;
        LeaveCriticalSection(&criticalSection);  // CRITICAL_SECTION 해제
    }
}

void measurePerformance(void (*func)(), const std::string& name) {
    auto start = std::chrono::high_resolution_clock::now();

    std::thread t1(func);
    std::thread t2(func);
    t1.join();
    t2.join();

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();
    std::cout << name << " took " << duration << " ms" << std::endl;
}

int main() {
    // Initialize CRITICAL_SECTION
    InitializeCriticalSection(&criticalSection);

    // std::mutex 성능 테스트
    measurePerformance(incrementWithStdMutex, "std::mutex");

    // CreateMutex 성능 테스트
    measurePerformance(incrementWithCreateMutex, "CreateMutex");

    // CRITICAL_SECTION 성능 테스트
    measurePerformance(incrementWithCriticalSection, "CRITICAL_SECTION");

    // Clean up
    CloseHandle(hMutex);
    DeleteCriticalSection(&criticalSection);

    return 0;
}
