#include <iostream>
#include <queue>
#include <windows.h>

std::queue<int> dataQueue;
bool done = false;

// Cond 클래스: CRITICAL_SECTION과 CONDITION_VARIABLE을 감싸는 클래스
class Cond {
public:
    Cond() {
        InitializeCriticalSection(&cs);
        InitializeConditionVariable(&condVar);
    }

    ~Cond() {
        DeleteCriticalSection(&cs);
    }

    // 잠금과 함께 조건 변수를 사용하여 대기
    void wait() {
        EnterCriticalSection(&cs);
        while (dataQueue.empty() && !done) {
            SleepConditionVariableCS(&condVar, &cs, INFINITE);
        }
        LeaveCriticalSection(&cs);
    }

    // 단일 스레드를 깨움
    void notify() {
        EnterCriticalSection(&cs);
        WakeConditionVariable(&condVar);
        LeaveCriticalSection(&cs);
    }

    // 모든 대기 중인 스레드를 깨움
    void notifyAll() {
        EnterCriticalSection(&cs);
        WakeAllConditionVariable(&condVar);
        LeaveCriticalSection(&cs);
    }

    // 데이터 접근에 대한 잠금 제어
    void lock() {
        EnterCriticalSection(&cs);
    }

    void unlock() {
        LeaveCriticalSection(&cs);
    }

private:
    CRITICAL_SECTION cs;
    CONDITION_VARIABLE condVar;
};

// 전역 Cond 객체
Cond cond;

// 생산자 함수 (Producer)
DWORD WINAPI producer(LPVOID lpParam) {
    for (int i = 1; i <= 10; ++i) {
        cond.lock();
        dataQueue.push(i);
        std::cout << "Produced: " << i << std::endl;
        cond.unlock();
        cond.notify();  // 소비자에게 알림
    }

    // 모든 데이터 생산 완료
    cond.lock();
    done = true;
    cond.unlock();
    cond.notifyAll();  // 모든 대기 스레드 알림
    return 0;
}

// 소비자 함수 (Consumer)
DWORD WINAPI consumer(LPVOID lpParam) {
    while (true) {
        cond.wait();  // 조건 변수 대기

        // 큐에 쌓인 모든 데이터를 한 번에 가져오기
        cond.lock();
        while (!dataQueue.empty()) {
            int value = dataQueue.front();
            dataQueue.pop();
            std::cout << "Consumed: " << value << std::endl;
        }
        bool finished = done && dataQueue.empty();
        cond.unlock();

        // 종료 조건 확인
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
