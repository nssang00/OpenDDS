#include <iostream>

#ifdef _WIN32
#include <windows.h>
#else
#include <pthread.h>
#endif

class SpinLock {
public:
    SpinLock() {
#ifdef _WIN32
        lockFlag = 0;
#else
        pthread_spin_init(&spinlock, 0);
#endif
    }

    ~SpinLock() {
#ifdef _WIN32
        // Windows에서는 특별히 할 일이 없음
#else
        pthread_spin_destroy(&spinlock);
#endif
    }

    void lock() {
#ifdef _WIN32
        while (InterlockedExchange(&lockFlag, 1) == 1) {
            Sleep(0); // 다른 스레드에 CPU 양보
        }
#else
        pthread_spin_lock(&spinlock);
#endif
    }

    void unlock() {
#ifdef _WIN32
        InterlockedExchange(&lockFlag, 0);
#else
        pthread_spin_unlock(&spinlock);
#endif
    }

private:
#ifdef _WIN32
    volatile LONG lockFlag;  // Windows에서 Spin Lock 상태 (0: 잠금 해제, 1: 잠금)
#else
    pthread_spinlock_t spinlock; // Linux에서 Spin Lock 상태
#endif
};
