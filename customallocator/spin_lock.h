#ifdef _WIN32
#include <windows.h>
#else
#include <pthread.h>
#include <ctime>
#endif

class SpinLock {
public:
    SpinLock();
    ~SpinLock();

    void lock(); 
    void unlock();
    bool timed_lock(int milliseconds); // New method

private:
#ifdef _WIN32
    LONG lockFlag; 
#else
    pthread_spinlock_t lock;
#endif
};

#include "SpinLock.h"
#include <time.h>  // Include for clock_gettime

SpinLock::SpinLock() {
#ifdef _WIN32
    lockFlag = 0; // 초기값 설정
#else
    pthread_spin_init(&lock, PTHREAD_PROCESS_PRIVATE);
#endif
}

SpinLock::~SpinLock() {
#ifdef _WIN32
    // Windows에서는 특별한 정리 작업이 필요하지 않음
#else
    pthread_spin_destroy(&lock);
#endif
}

void SpinLock::lock() {
#ifdef _WIN32
    while (InterlockedCompareExchange(&lockFlag, 1, 0) != 0) {
        Sleep(0); 
    }
#else
    pthread_spin_lock(&lock);
#endif
}

void SpinLock::unlock() {
#ifdef _WIN32
    // 락을 해제
    InterlockedExchange(&lockFlag, 0);
#else
    pthread_spin_unlock(&lock);
#endif
}

bool SpinLock::timed_lock(int milliseconds) {
#ifdef _WIN32
    LARGE_INTEGER frequency, start, current;
    QueryPerformanceFrequency(&frequency); // 주파수 가져오기
    QueryPerformanceCounter(&start); // 시작 시간 가져오기

    while (InterlockedCompareExchange(&lockFlag, 1, 0) != 0) {
        QueryPerformanceCounter(&current);
        double elapsed = static_cast<double>(current.QuadPart - start.QuadPart) / frequency.QuadPart;

        // 주어진 시간(밀리초)을 초로 변환하여 비교
        if (elapsed >= milliseconds / 1000.0) {
            return false; // 시간이 초과됨
        }
        Sleep(0); // 다른 스레드에 CPU 양보
    }

    return true; // 락을 성공적으로 획득
#else
    struct timespec start, current;
    clock_gettime(CLOCK_MONOTONIC, &start); // 시작 시간 가져오기

    while (pthread_spin_trylock(&lock) != 0) {
        clock_gettime(CLOCK_MONOTONIC, &current); // 현재 시간 가져오기

        // 경과 시간 계산 (밀리초로 변환)
        long elapsed = (current.tv_sec - start.tv_sec) * 1000 + 
                       (current.tv_nsec - start.tv_nsec) / 1000000; // 나노초를 밀리초로 변환

        if (elapsed >= milliseconds) {
            return false; // 시간이 초과됨
        }
    }

    return true; // 락을 성공적으로 획득
#endif
}
