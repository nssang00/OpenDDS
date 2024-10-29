#ifndef SPINLOCK_H
#define SPINLOCK_H

#ifdef _WIN32
#include <windows.h>
#else
#include <pthread.h>
#endif

class SpinLock {
public:
    SpinLock();
    ~SpinLock();

    void lock(); 
    void unlock(); 

private:
#ifdef _WIN32
    LONG lockFlag; 
#else
    pthread_spinlock_t lock;
#endif
};

#endif // SPINLOCK_H

#include "SpinLock.h"

SpinLock::SpinLock() {
#ifdef _WIN32
    lockFlag = 0; // 초기값 설정
#else
    pthread_spin_init(&lock, PTHREAD_PROCESS_PRIVATE);
#endif
}

SpinLock::~SpinLock() {
#ifdef _WIN32
#else
    pthread_spin_destroy(&lock);
#endif
}

void SpinLock::lock() {
#ifdef _WIN32
    while (InterlockedExchange(&lockFlag, 1) == 1) {
        Sleep(0); // 다른 스레드에 CPU 양보
    }
#else
    pthread_spin_lock(&lock);
#endif
}

void SpinLock::unlock() {
#ifdef _WIN32
    InterlockedExchange(&lockFlag, 0);
#else
    pthread_spin_unlock(&lock);
#endif
}
