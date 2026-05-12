#include <windows.h>
#include <stdio.h>

int main()
{
    // ── 1. COM 포트 열기 ─────────────────────────────────────────
    HANDLE hCom = CreateFileA(
        "COM3",
        GENERIC_READ | GENERIC_WRITE,
        0, nullptr, OPEN_EXISTING,
        FILE_FLAG_OVERLAPPED, nullptr
    );
    if (hCom == INVALID_HANDLE_VALUE) {
        printf("CreateFile failed: %lu\n", GetLastError());
        return 1;
    }

    // ── 2. DCB 설정 ──────────────────────────────────────────────
    DCB dcb = {};
    dcb.DCBlength = sizeof(DCB);
    GetCommState(hCom, &dcb);
    dcb.BaudRate = CBR_115200;
    dcb.ByteSize = 8;
    dcb.Parity   = NOPARITY;
    dcb.StopBits = ONESTOPBIT;
    SetCommState(hCom, &dcb);

    COMMTIMEOUTS timeouts = {};
    timeouts.ReadIntervalTimeout        = MAXDWORD;
    timeouts.ReadTotalTimeoutMultiplier = MAXDWORD;
    timeouts.ReadTotalTimeoutConstant   = 50;
    SetCommTimeouts(hCom, &timeouts);

    // ── 3. ★ 감시할 이벤트 등록 ──────────────────────────────────
    if (!SetCommMask(hCom, EV_RXCHAR | EV_ERR | EV_BREAK)) {
        printf("SetCommMask failed: %lu\n", GetLastError());
        CloseHandle(hCom);
        return 1;
    }

    // ── 4. Overlapped 이벤트 2개 (CommEvent용 / Read용) ─────────
    OVERLAPPED ovWait = {};
    OVERLAPPED ovRead = {};
    ovWait.hEvent = CreateEvent(nullptr, TRUE, FALSE, nullptr);
    ovRead.hEvent = CreateEvent(nullptr, TRUE, FALSE, nullptr);

    const DWORD BUF_SIZE = 256;
    BYTE  buf[BUF_SIZE + 1];
    DWORD dwRead     = 0;
    DWORD dwEvtMask  = 0;

    printf("Waiting for COM events...\n");

    while (true)
    {
        // ── 5. ★ WaitCommEvent (Overlapped) ──────────────────────
        dwEvtMask = 0;
        ResetEvent(ovWait.hEvent);

        BOOL ok = WaitCommEvent(hCom, &dwEvtMask, &ovWait);
        if (!ok) {
            DWORD err = GetLastError();
            if (err == ERROR_IO_PENDING) {
                // 이벤트 올 때까지 대기
                DWORD w = WaitForSingleObject(ovWait.hEvent, INFINITE);
                if (w != WAIT_OBJECT_0) {
                    printf("WaitForSingleObject failed: %lu\n", GetLastError());
                    break;
                }
                GetOverlappedResult(hCom, &ovWait, &dwRead, FALSE);
            } else {
                printf("WaitCommEvent failed: %lu\n", err);
                break;
            }
        }

        // ── 6. 발생한 이벤트 분기 ────────────────────────────────
        if (dwEvtMask & EV_ERR) {
            // 오류 종류 확인
            DWORD dwErrors = 0;
            COMSTAT cs = {};
            ClearCommError(hCom, &dwErrors, &cs);

            if (dwErrors & CE_FRAME)  printf("[ERR] Framing error\n");
            if (dwErrors & CE_OVERRUN) printf("[ERR] Overrun error\n");
            if (dwErrors & CE_RXPARITY) printf("[ERR] Parity error\n");
        }

        if (dwEvtMask & EV_BREAK) {
            printf("[EVT] Break signal detected\n");
        }

        if (dwEvtMask & EV_RXCHAR) {
            // ── 7. 수신 데이터 ReadFile ───────────────────────────
            ResetEvent(ovRead.hEvent);
            dwRead = 0;

            BOOL rok = ReadFile(hCom, buf, BUF_SIZE, &dwRead, &ovRead);
            if (!rok) {
                DWORD err = GetLastError();
                if (err == ERROR_IO_PENDING) {
                    WaitForSingleObject(ovRead.hEvent, 3000);
                    GetOverlappedResult(hCom, &ovRead, &dwRead, FALSE);
                } else {
                    printf("ReadFile failed: %lu\n", err);
                    break;
                }
            }

            if (dwRead > 0) {
                buf[dwRead] = '\0';
                printf("[RX %lu bytes] %s\n", dwRead, buf);
            }
        }
    }

    // ── 8. 정리 ──────────────────────────────────────────────────
    CloseHandle(ovWait.hEvent);
    CloseHandle(ovRead.hEvent);
    CloseHandle(hCom);
    return 0;
}
/////////////////
#include <windows.h>
#include <stdio.h>

int main()
{
    HANDLE hCom = CreateFileA(
        "COM3",
        GENERIC_READ | GENERIC_WRITE,
        0, nullptr, OPEN_EXISTING,
        FILE_FLAG_OVERLAPPED, nullptr
    );
    if (hCom == INVALID_HANDLE_VALUE) {
        printf("CreateFile failed: %lu\n", GetLastError());
        return 1;
    }

    // ── DCB 설정 ─────────────────────────────────────────────────
    DCB dcb = {};
    dcb.DCBlength = sizeof(DCB);
    GetCommState(hCom, &dcb);
    dcb.BaudRate = CBR_115200;
    dcb.ByteSize = 8;
    dcb.Parity   = NOPARITY;
    dcb.StopBits = ONESTOPBIT;
    SetCommState(hCom, &dcb);

    // ── ✅ 핵심 수정: COMMTIMEOUTS ────────────────────────────────
    COMMTIMEOUTS timeouts = {};
    timeouts.ReadIntervalTimeout        = MAXDWORD; // 수신된 데이터 즉시 반환
    timeouts.ReadTotalTimeoutMultiplier = MAXDWORD;
    timeouts.ReadTotalTimeoutConstant   = 50;       // 마지막 수신 후 50ms
    SetCommTimeouts(hCom, &timeouts);

    // ── Overlapped 이벤트 ─────────────────────────────────────────
    OVERLAPPED ov = {};
    ov.hEvent = CreateEvent(nullptr, TRUE, FALSE, nullptr);
    if (!ov.hEvent) {
        CloseHandle(hCom);
        return 1;
    }

    const DWORD BUF_SIZE = 256;
    BYTE  buf[BUF_SIZE + 1];
    DWORD dwRead = 0;

    printf("Reading from COM3...\n");

    while (true)
    {
        // ✅ ReadFile 직전에 리셋
        ResetEvent(ov.hEvent);
        dwRead = 0;

        BOOL ok = ReadFile(hCom, buf, BUF_SIZE, &dwRead, &ov);
        DWORD err = GetLastError();

        if (!ok && err != ERROR_IO_PENDING) {
            printf("ReadFile failed: %lu\n", err);
            break;
        }

        if (!ok && err == ERROR_IO_PENDING) {
            // 비동기 대기
            DWORD waitResult = WaitForSingleObject(ov.hEvent, 5000);

            if (waitResult == WAIT_TIMEOUT) {
                printf("Timeout.\n");
                CancelIo(hCom);
                // ✅ 취소 후 결과를 반드시 수거해야 다음 ReadFile 가능
                GetOverlappedResult(hCom, &ov, &dwRead, TRUE);
                continue;
            }
            else if (waitResult != WAIT_OBJECT_0) {
                printf("Wait failed: %lu\n", GetLastError());
                break;
            }

            if (!GetOverlappedResult(hCom, &ov, &dwRead, FALSE)) {
                printf("GetOverlappedResult failed: %lu\n", GetLastError());
                break;
            }
        }

        // ✅ 0바이트 즉시 완료 방지
        if (dwRead == 0) {
            Sleep(1);
            continue;
        }

        buf[dwRead] = '\0';
        printf("[%lu bytes] %s\n", dwRead, buf);
    }

    CloseHandle(ov.hEvent);
    CloseHandle(hCom);
    return 0;
}

//////////write
#include <windows.h>
#include <stdio.h>

int main()
{
    // ── 1. COM 포트 열기 ──────────────────────────────────────────
    HANDLE hCom = CreateFileA(
        "COM3",
        GENERIC_READ | GENERIC_WRITE,
        0,
        nullptr,
        OPEN_EXISTING,
        FILE_FLAG_OVERLAPPED,
        nullptr
    );
    if (hCom == INVALID_HANDLE_VALUE) {
        printf("CreateFile failed: %lu\n", GetLastError());
        return 1;
    }

    // ── 2. 통신 파라미터 설정 ────────────────────────────────────
    DCB dcb = {};
    dcb.DCBlength = sizeof(DCB);
    GetCommState(hCom, &dcb);
    dcb.BaudRate = CBR_115200;
    dcb.ByteSize = 8;
    dcb.Parity   = NOPARITY;
    dcb.StopBits = ONESTOPBIT;
    if (!SetCommState(hCom, &dcb)) {
        printf("SetCommState failed: %lu\n", GetLastError());
        CloseHandle(hCom);
        return 1;
    }

    COMMTIMEOUTS timeouts = {};
    SetCommTimeouts(hCom, &timeouts);

    // ── 3. Overlapped 구조체 + Event 생성 ───────────────────────
    OVERLAPPED ov = {};
    ov.hEvent = CreateEvent(nullptr, TRUE, FALSE, nullptr);
    if (!ov.hEvent) {
        printf("CreateEvent failed: %lu\n", GetLastError());
        CloseHandle(hCom);
        return 1;
    }

    // ── 4. 송신할 데이터 ─────────────────────────────────────────
    const char* sendData[] = {
        "Hello COM3!\r\n",
        "Second message\r\n",
        "Third message\r\n",
    };

    // ── 5. 쓰기 루프 ─────────────────────────────────────────────
    for (const char* msg : sendData)
    {
        DWORD dwToWrite = (DWORD)strlen(msg);
        DWORD dwWritten = 0;

        ResetEvent(ov.hEvent);          // ★ 매 호출 전 반드시 리셋

        BOOL ok = WriteFile(hCom, msg, dwToWrite, &dwWritten, &ov);

        if (!ok) {
            DWORD err = GetLastError();
            if (err == ERROR_IO_PENDING) {
                // ── 비동기 완료 대기 ─────────────────────────────
                DWORD waitResult = WaitForSingleObject(ov.hEvent, 3000); // 3 s

                if (waitResult == WAIT_OBJECT_0) {
                    if (!GetOverlappedResult(hCom, &ov, &dwWritten, FALSE)) {
                        printf("GetOverlappedResult failed: %lu\n", GetLastError());
                        break;
                    }
                }
                else if (waitResult == WAIT_TIMEOUT) {
                    printf("WriteFile timeout.\n");
                    CancelIo(hCom);
                    continue;
                }
                else {
                    printf("WaitForSingleObject failed: %lu\n", GetLastError());
                    break;
                }
            }
            else {
                printf("WriteFile failed: %lu\n", err);
                break;
            }
        }
        // ok == TRUE : 즉시 완료

        if (dwWritten == dwToWrite) {
            printf("[OK] Sent %lu bytes: %s", dwWritten, msg);
        } else {
            // 일부만 전송된 경우 → 나머지 재전송 필요
            printf("[WARN] Requested %lu, but sent %lu bytes\n", dwToWrite, dwWritten);
        }

        Sleep(100); // 송신 간격 (선택)
    }

    // ── 6. 정리 ──────────────────────────────────────────────────
    CloseHandle(ov.hEvent);
    CloseHandle(hCom);
    return 0;
}
