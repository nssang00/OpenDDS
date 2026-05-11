#include <windows.h>
#include <stdio.h>

int main()
{
    // ── 1. COM 포트 열기 ──────────────────────────────────────────
    HANDLE hCom = CreateFileA(
        "COM3",
        GENERIC_READ | GENERIC_WRITE,
        0,              // 공유 없음
        nullptr,
        OPEN_EXISTING,
        FILE_FLAG_OVERLAPPED,   // ★ Overlapped 모드
        nullptr
    );
    if (hCom == INVALID_HANDLE_VALUE) {
        printf("CreateFile failed: %lu\n", GetLastError());
        return 1;
    }

    // ── 2. 통신 파라미터 설정 ────────────────────────────────────
    DCB dcb = {};
    dcb.DCBlength = sizeof(DCB);
    if (!GetCommState(hCom, &dcb)) {
        printf("GetCommState failed: %lu\n", GetLastError());
        CloseHandle(hCom);
        return 1;
    }
    dcb.BaudRate = CBR_115200;
    dcb.ByteSize = 8;
    dcb.Parity   = NOPARITY;
    dcb.StopBits = ONESTOPBIT;
    if (!SetCommState(hCom, &dcb)) {
        printf("SetCommState failed: %lu\n", GetLastError());
        CloseHandle(hCom);
        return 1;
    }

    // ── 3. 타임아웃 설정 (Overlapped이므로 모두 0) ───────────────
    COMMTIMEOUTS timeouts = {};
    // 모두 0 → ReadFile이 즉시 반환(수신된 것만 읽음)
    // GetOverlappedResult로 완료를 별도 대기
    SetCommTimeouts(hCom, &timeouts);

    // ── 4. Overlapped 구조체 + Event 생성 ───────────────────────
    OVERLAPPED ov = {};
    ov.hEvent = CreateEvent(
        nullptr,    // 보안 속성
        TRUE,       // Manual-reset
        FALSE,      // 초기 상태: non-signaled
        nullptr
    );
    if (!ov.hEvent) {
        printf("CreateEvent failed: %lu\n", GetLastError());
        CloseHandle(hCom);
        return 1;
    }

    // ── 5. 읽기 루프 ─────────────────────────────────────────────
    const DWORD BUF_SIZE = 256;
    BYTE  buf[BUF_SIZE];
    DWORD dwRead = 0;

    printf("Reading from COM3 ... (Ctrl+C to stop)\n");

    while (true)
    {
        ResetEvent(ov.hEvent);          // ★ 매 호출 전에 반드시 리셋

        BOOL ok = ReadFile(hCom, buf, BUF_SIZE, &dwRead, &ov);

        if (!ok) {
            DWORD err = GetLastError();
            if (err == ERROR_IO_PENDING) {
                // ── 비동기 대기 ───────────────────────────────
                DWORD waitResult = WaitForSingleObject(ov.hEvent, 3000); // 3 s timeout

                if (waitResult == WAIT_OBJECT_0) {
                    // I/O 완료 → 실제 읽은 바이트 수 획득
                    if (!GetOverlappedResult(hCom, &ov, &dwRead, FALSE)) {
                        printf("GetOverlappedResult failed: %lu\n", GetLastError());
                        break;
                    }
                }
                else if (waitResult == WAIT_TIMEOUT) {
                    printf("Timeout, no data.\n");
                    // 대기 중인 I/O 취소
                    CancelIo(hCom);
                    continue;
                }
                else {
                    printf("WaitForSingleObject failed: %lu\n", GetLastError());
                    break;
                }
            }
            else {
                printf("ReadFile failed: %lu\n", err);
                break;
            }
        }
        // ok == TRUE : 즉시 완료(버퍼에 데이터가 이미 있었음)

        if (dwRead > 0) {
            buf[dwRead] = '\0';
            printf("[%lu bytes] %s\n", dwRead, buf);
        }
    }

    // ── 6. 정리 ──────────────────────────────────────────────────
    CloseHandle(ov.hEvent);
    CloseHandle(hCom);
    return 0;
}
