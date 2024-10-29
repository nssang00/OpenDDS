#include <iostream>

#if defined(_WIN32)
    #include <windows.h>
#else
    #include <pthread.h>
    #include <sys/time.h>
#endif

class Cond {
public:
    Cond(bool bManualReset = false);
    ~Cond();

    bool wait();
    bool timedwait(unsigned int timeout);
    bool signal(bool bFlush = true);
    bool waitsignal();

private:
    bool wait(unsigned int timeout);

#if defined(_WIN32)
    CONDITION_VARIABLE condVar;
    CRITICAL_SECTION cs;
#else
    pthread_cond_t condVar;
    pthread_mutex_t mtx;
#endif

    bool signaled;
    bool bManualReset;
};

Cond::Cond(bool bManualReset)
    : bManualReset(bManualReset), signaled(false) {
#if defined(_WIN32)
    InitializeConditionVariable(&condVar);
    InitializeCriticalSection(&cs);
#else
    pthread_cond_init(&condVar, nullptr);
    pthread_mutex_init(&mtx, nullptr);
#endif
}

Cond::~Cond() {
#if defined(_WIN32)
    DeleteCriticalSection(&cs);
#else
    pthread_cond_destroy(&condVar);
    pthread_mutex_destroy(&mtx);
#endif
}

bool Cond::wait() {
#if defined(_WIN32)
    EnterCriticalSection(&cs);
    while (!signaled) {
        SleepConditionVariableCS(&condVar, &cs, INFINITE);
    }
    if (!bManualReset) {
        signaled = false;
    }
    LeaveCriticalSection(&cs);
#else
    pthread_mutex_lock(&mtx);
    while (!signaled) {
        pthread_cond_wait(&condVar, &mtx);
    }
    if (!bManualReset) {
        signaled = false;
    }
    pthread_mutex_unlock(&mtx);
#endif
    return true;
}

bool Cond::wait(unsigned int timeout) {
#if defined(_WIN32)
    EnterCriticalSection(&cs);
    bool ret = true;

    if (!signaled) {
        DWORD result = SleepConditionVariableCS(&condVar, &cs, timeout);
        ret = (result != 0);
    }
    if (!bManualReset && ret) {
        signaled = false;
    }
    LeaveCriticalSection(&cs);
    return ret;
#else
    pthread_mutex_lock(&mtx);
    bool ret = true;
    if (!signaled) {
        struct timespec ts;
        clock_gettime(CLOCK_REALTIME, &ts);
        ts.tv_sec += timeout / 1000;
        ts.tv_nsec += (timeout % 1000) * 1000000;

        int result = pthread_cond_timedwait(&condVar, &mtx, &ts);
        ret = (result == 0);
    }
    if (!bManualReset && ret) {
        signaled = false;
    }
    pthread_mutex_unlock(&mtx);
    return ret;
#endif
}

bool Cond::timedwait(unsigned int timeout) {
    return wait(timeout);
}

bool Cond::signal(bool bFlush) {
#if defined(_WIN32)
    EnterCriticalSection(&cs);
    signaled = true;
    LeaveCriticalSection(&cs);

    if (bFlush) {
        WakeAllConditionVariable(&condVar);
    } else {
        WakeConditionVariable(&condVar);
    }
#else
    pthread_mutex_lock(&mtx);
    signaled = true;
    pthread_mutex_unlock(&mtx);

    if (bFlush) {
        pthread_cond_broadcast(&condVar);
    } else {
        pthread_cond_signal(&condVar);
    }
#endif
    return true;
}

bool Cond::waitsignal() {
#if defined(_WIN32)
    EnterCriticalSection(&cs);
    signaled = false;
    LeaveCriticalSection(&cs);
#else
    pthread_mutex_lock(&mtx);
    signaled = false;
    pthread_mutex_unlock(&mtx);
#endif
    return true;
}
