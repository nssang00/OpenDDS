#include <winsock2.h>
#include <iphlpapi.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <windows.h>

#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "ws2_32.lib")

#ifndef GAA_FLAG_INCLUDE_PREFIX
#define GAA_FLAG_INCLUDE_PREFIX 0x00000010
#endif

bool IsVirtualAdapter(const char* desc) {
    if (!desc) return false;
    return strstr(desc, "Virtual") || strstr(desc, "VMware") || strstr(desc, "Hyper-V") || strstr(desc, "Loopback") || strstr(desc, "Bluetooth") || strstr(desc, "TAP") || strstr(desc, "Miniport");
}

void PrintActivePhysicalAdapters() {
    ULONG bufferSize = 0;
    if (GetAdaptersAddresses(AF_UNSPEC, GAA_FLAG_INCLUDE_PREFIX, NULL, NULL, &bufferSize) != ERROR_BUFFER_OVERFLOW) {
        printf("Failed to get buffer size.\n");
        return;
    }

    IP_ADAPTER_ADDRESSES* pAddresses = (IP_ADAPTER_ADDRESSES*)malloc(bufferSize);
    if (!pAddresses) {
        printf("Memory allocation failed.\n");
        return;
    }

    DWORD result = GetAdaptersAddresses(AF_UNSPEC, GAA_FLAG_INCLUDE_PREFIX, NULL, pAddresses, &bufferSize);
    if (result != NO_ERROR) {
        printf("GetAdaptersAddresses failed with error: %lu\n", result);
        free(pAddresses);
        return;
    }

    int index = 0;
    for (IP_ADAPTER_ADDRESSES* adapter = pAddresses; adapter != NULL; adapter = adapter->Next, ++index) {
        printf("\n==> 어댑터 #%d 검사 시작\n", index);

        // 어댑터 이름 출력
        printf("AdapterName: %s\n", adapter->AdapterName);

        // Description 변환
        char descA[256] = {0};
        WideCharToMultiByte(CP_ACP, 0, adapter->Description, -1, descA, sizeof(descA), NULL, NULL);
        printf("Description: %s\n", descA);

        // 조건 1: OperStatus
        if (adapter->OperStatus != IfOperStatusUp) {
            printf("-- 필터됨: 비활성 상태 (OperStatus != UP)\n");
            continue;
        } else {
            printf("OK: 활성화된 상태\n");
        }

        // 조건 2: 디폴트 게이트웨이 확인
        if (adapter->FirstGatewayAddress == NULL) {
            printf("-- 필터됨: 디폴트 게이트웨이 없음\n");
            continue;
        } else {
            printf("OK: 디폴트 게이트웨이 있음\n");
        }

        // 조건 3: 가상 어댑터 여부
        if (IsVirtualAdapter(descA)) {
            printf("-- 필터됨: 가상 어댑터로 판단됨\n");
            continue;
        } else {
            printf("OK: 물리적 어댑터로 판단됨\n");
        }

        // 최종 통과
        printf("** 출력 대상 **\n");

        printf("MAC Address: ");
        for (UINT i = 0; i < adapter->PhysicalAddressLength; i++) {
            if (i) printf("-");
            printf("%02X", adapter->PhysicalAddress[i]);
        }
        printf("\n");
    }

    free(pAddresses);
}

int main() {
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) == 0) {
        PrintActivePhysicalAdapters();
        WSACleanup();
    } else {
        printf("WSAStartup failed.\n");
    }

    return 0;
}
