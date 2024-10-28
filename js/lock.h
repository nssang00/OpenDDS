#include <iostream>

#ifdef _WIN32
    #include <Windows.h>
#else
    #include <pthread.h>
#endif

class Lock {
public:
    Lock() {
#ifdef _WIN32
        InitializeCriticalSection(&cs);
#else
        pthread_mutex_init(&mutex, nullptr);
#endif
    }

    ~Lock() {
#ifdef _WIN32
        DeleteCriticalSection(&cs);
#else
        pthread_mutex_destroy(&mutex);
#endif
    }

    void lock() {
#ifdef _WIN32
        EnterCriticalSection(&cs);
#else
        pthread_mutex_lock(&mutex);
#endif
    }

    void unlock() {
#ifdef _WIN32
        LeaveCriticalSection(&cs);
#else
        pthread_mutex_unlock(&mutex);
#endif
    }

private:
#ifdef _WIN32
    CRITICAL_SECTION cs;
#else
    pthread_mutex_t mutex;
#endif
};

int main() {
    Lock myLock;

    myLock.lock();
    std::cout << "Critical section protected" << std::endl;
    myLock.unlock();

    return 0;
}
