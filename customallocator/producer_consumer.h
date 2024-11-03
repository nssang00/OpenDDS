#include <iostream>
#include <queue>
#include <windows.h>

std::queue<int> dataQueue;
CRITICAL_SECTION cs;                    // 뮤텍스로 사용할 크리티컬 섹션
CONDITION_VARIABLE condVar;             // 조건 변수
bool done = false;                      // 생산 완료 플래그

// 생산자 함수 (Publisher)
DWORD WINAPI producer(LPVOID lpParam) {
    for (int i = 1; i <= 10; ++i) {
        EnterCriticalSection(&cs);      // 크리티컬 섹션 잠금
        dataQueue.push(i);
        std::cout << "Produced: " << i << std::endl;
        LeaveCriticalSection(&cs);      // 크리티컬 섹션 잠금 해제
        WakeConditionVariable(&condVar); // 조건 변수 알림
    }

    // 모든 데이터 생산 완료
    EnterCriticalSection(&cs);
    done = true;
    LeaveCriticalSection(&cs);
    WakeAllConditionVariable(&condVar); // 모든 대기 스레드 알림
    return 0;
}

// 소비자 함수 (Subscriber)
DWORD WINAPI consumer(LPVOID lpParam) {
    while (true) {
        EnterCriticalSection(&cs);
        // 조건 변수를 사용하여 대기 (큐가 비어있거나 done이 true가 될 때까지 대기)
        while (dataQueue.empty() && !done) {
            SleepConditionVariableCS(&condVar, &cs, INFINITE);
        }

        // 큐에 있는 모든 데이터 한 번에 처리
        while (!dataQueue.empty()) {
            int value = dataQueue.front();
            dataQueue.pop();
            std::cout << "Consumed: " << value << std::endl;
        }

        // 종료 조건 확인
        if (done && dataQueue.empty()) {
            LeaveCriticalSection(&cs);
            break;
        }
        LeaveCriticalSection(&cs);
    }
    return 0;
}

int main() {
    // 크리티컬 섹션과 조건 변수 초기화
    InitializeCriticalSection(&cs);
    InitializeConditionVariable(&condVar);

    // 스레드 생성
    HANDLE producerThread = CreateThread(NULL, 0, producer, NULL, 0, NULL);
    HANDLE consumerThread = CreateThread(NULL, 0, consumer, NULL, 0, NULL);

    // 스레드 종료 대기
    WaitForSingleObject(producerThread, INFINITE);
    WaitForSingleObject(consumerThread, INFINITE);

    // 리소스 정리
    CloseHandle(producerThread);
    CloseHandle(consumerThread);
    DeleteCriticalSection(&cs);

    return 0;
}
