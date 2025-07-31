#include <windows.h>
#include <iphlpapi.h>
#include <stdio.h>
#include <string.h>
#include <ctype.h>
#pragma comment(lib, "iphlpapi.lib")

BOOL isPhysicalAdapter(const char* desc) {
    char lowerDesc[512] = {0};
    for (int i = 0; desc[i] && i < sizeof(lowerDesc) - 1; ++i) {
        lowerDesc[i] = (char)tolower(desc[i]);
    }

    return strstr(lowerDesc, "virtual") == NULL &&
           strstr(lowerDesc, "vmware") == NULL &&
           strstr(lowerDesc, "hyper-v") == NULL &&
           strstr(lowerDesc, "loopback") == NULL &&
           strstr(lowerDesc, "bluetooth") == NULL;
}

int main() {
    IP_ADAPTER_INFO adapterInfo[16]; // 최대 16개 어댑터
    DWORD bufLen = sizeof(adapterInfo);

    DWORD status = GetAdaptersInfo(adapterInfo, &bufLen);
    if (status != ERROR_SUCCESS) {
        printf("GetAdaptersInfo 실패: %lu\n", status);
        return 1;
    }

    IP_ADAPTER_INFO* best = NULL;
    ULONG bestIndex = ~0U;

    IP_ADAPTER_INFO* adapter = adapterInfo;
    while (adapter) {
        if (adapter->AddressLength == 0 || adapter->DhcpEnabled == 0 || adapter->GatewayList.IpAddress.String[0] == '\0') {
            adapter = adapter->Next;
            continue;
        }

        if (!isPhysicalAdapter(adapter->Description)) {
            adapter = adapter->Next;
            continue;
        }

        // 인터페이스 인덱스가 가장 낮은 걸 선택 (간접적으로 metric 대용)
        if (adapter->Index < bestIndex) {
            best = adapter;
            bestIndex = adapter->Index;
        }

        adapter = adapter->Next;
    }

    if (best) {
        printf("선택된 어댑터 이름: %s\n", best->AdapterName);
        printf("설명: %s\n", best->Description);

        printf("MAC 주소: ");
        for (UINT i = 0; i < best->AddressLength; ++i) {
            printf("%02X", best->Address[i]);
            if (i != best->AddressLength - 1)
                printf("-");
        }

        printf("\n기본 게이트웨이: %s\n", best->GatewayList.IpAddress.String);
    } else {
        printf("조건에 맞는 어댑터를 찾을 수 없습니다.\n");
    }

    return 0;
}
