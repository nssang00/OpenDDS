#include <iostream>
#include <queue>
#include <windows.h>

std::queue<int> dataQueue;
bool done = false;

// Mutex 클래스: CRITICAL_SECTION을 감싸는 클래스
class Mutex {
public:
    Mutex() {
        InitializeCriticalSection(&cs);
    }

    ~Mutex() {
        DeleteCriticalSection(&cs);
    }

    void lock() {
        EnterCriticalSection(&cs);
    }

    void unlock() {
        LeaveCriticalSection(&cs);
    }

private:
    CRITICAL_SECTION cs;
    friend class Cond;
};

// Cond 클래스: CONDITION_VARIABLE을 감싸는 클래스
class Cond {
public:
    Cond() {
        InitializeConditionVariable(&condVar);
    }

    void wait(Mutex& mutex) {
        SleepConditionVariableCS(&condVar, &mutex.cs, INFINITE);
    }

    void notify() {
        WakeConditionVariable(&condVar);
    }

private:
    CONDITION_VARIABLE condVar;
};

// 전역 Cond 및 Mutex 객체
Cond cond;
Mutex mutex;

// 생산자 함수 (Producer)
DWORD WINAPI producer(LPVOID lpParam) {
    for (int i = 1; i <= 10; ++i) {
        mutex.lock();
        dataQueue.push(i);
        std::cout << "Produced: " << i << std::endl;
        cond.notify();  // 개별 소비자에게 알림
        mutex.unlock();
    }

    // 모든 데이터 생산 완료 표시
    mutex.lock();
    done = true;
    cond.notify();  // 마지막으로 대기 중인 소비자에게 알림
    mutex.unlock();
    return 0;
}

// 소비자 함수 (Consumer)
DWORD WINAPI consumer(LPVOID lpParam) {
    while (true) {
        mutex.lock();
        
        // 조건 변수를 이용해 데이터가 있거나 done 플래그가 true가 될 때까지 대기
        while (dataQueue.empty() && !done) {
            cond.wait(mutex);
        }

        // 큐에서 데이터를 가져와 처리
        while (!dataQueue.empty()) {
            int value = dataQueue.front();
            dataQueue.pop();
            std::cout << "Consumed: " << value << std::endl;
        }
        
        // 종료 조건 확인
        bool finished = done && dataQueue.empty();
        mutex.unlock();

        if (finished) {
            break;
        }
    }
    return 0;
}

int main() {
    // 스레드 생성
    HANDLE producerThread = CreateThread(NULL, 0, producer, NULL, 0, NULL);
    HANDLE consumerThread = CreateThread(NULL, 0, consumer, NULL, 0, NULL);

    // 스레드 종료 대기
    WaitForSingleObject(producerThread, INFINITE);
    WaitForSingleObject(consumerThread, INFINITE);

    // 리소스 정리
    CloseHandle(producerThread);
    CloseHandle(consumerThread);

    return 0;
}
