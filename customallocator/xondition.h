#include <iostream>

#ifdef _WIN32
#include <windows.h>
#else
#include <pthread.h>
#endif

class Condition {
public:
    Condition() {
#ifdef _WIN32
        InitializeCriticalSection(&criticalSection);
        InitializeConditionVariable(&condition);
#else
        pthread_mutex_init(&mutex, nullptr);
        pthread_cond_init(&condition, nullptr);
#endif
    }

    ~Condition() {
#ifdef _WIN32
        DeleteCriticalSection(&criticalSection);
#else
        pthread_mutex_destroy(&mutex);
        pthread_cond_destroy(&condition);
#endif
    }

    void wait() {
#ifdef _WIN32
        EnterCriticalSection(&criticalSection);
        SleepConditionVariableCS(&condition, &criticalSection, INFINITE);
        LeaveCriticalSection(&criticalSection);
#else
        pthread_mutex_lock(&mutex);
        pthread_cond_wait(&condition, &mutex);
        pthread_mutex_unlock(&mutex);
#endif
    }

    void signal() {
#ifdef _WIN32
        WakeConditionVariable(&condition);
#else
        pthread_cond_signal(&condition);
#endif
    }

    void broadcast() {
#ifdef _WIN32
        WakeAllConditionVariable(&condition);
#else
        pthread_cond_broadcast(&condition);
#endif
    }

private:
#ifdef _WIN32
    CRITICAL_SECTION criticalSection;
    CONDITION_VARIABLE condition;
#else
    pthread_mutex_t mutex;
    pthread_cond_t condition;
#endif
};
