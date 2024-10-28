#ifndef SPIN_LOCK_H
#define SPIN_LOCK_H

#ifdef _WIN32
#include <windows.h>
#else
#include <pthread.h>
#include <sched.h>
#endif

class SpinLock {
private:
#ifdef _WIN32
    volatile LONG lock_flag;
#else
    volatile long lock_flag;
#endif

public:
    SpinLock() {
        lock_flag = 0;
    }

    void lock() {
#ifdef _WIN32
        while (InterlockedExchange(&lock_flag, 1) == 1) {
            // CPU 리소스 낭비를 줄이기 위한 짧은 대기
            Sleep(0);
        }
#else
        while (__sync_lock_test_and_set(&lock_flag, 1)) {
            // CPU 리소스 낭비를 줄이기 위한 짧은 대기
            sched_yield();
        }
#endif
    }

    void unlock() {
#ifdef _WIN32
        InterlockedExchange(&lock_flag, 0);
#else
        __sync_lock_release(&lock_flag);
#endif
    }

    // 복사 방지를 위한 private 선언
private:
    SpinLock(const SpinLock&);
    SpinLock& operator=(const SpinLock&);
};

#endif // SPIN_LOCK_H
