#include <stdio.h>
#include <windows.h>
#include <iphlpapi.h>
#include <ws2tcpip.h>
#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "ws2_32.lib")

BOOL isPhysicalAdapter(const char* desc) {
    // 간단한 문자열 검사로 가상 어댑터 제외
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
    ULONG size = 0;
    DWORD ret = GetAdaptersAddresses(AF_UNSPEC, GAA_FLAG_INCLUDE_PREFIX, NULL, NULL, &size);
    if (ret != ERROR_BUFFER_OVERFLOW) {
        printf("GetAdaptersAddresses failed (pre-size): %lu\n", ret);
        return 1;
    }

    IP_ADAPTER_ADDRESSES* adapters = (IP_ADAPTER_ADDRESSES*)malloc(size);
    if (!adapters) {
        printf("Memory allocation failed\n");
        return 1;
    }

    ret = GetAdaptersAddresses(AF_UNSPEC, GAA_FLAG_INCLUDE_PREFIX, NULL, adapters, &size);
    if (ret != NO_ERROR) {
        printf("GetAdaptersAddresses failed: %lu\n", ret);
        free(adapters);
        return 1;
    }

    IP_ADAPTER_ADDRESSES* best = NULL;
    ULONG bestMetric = ~0U;  // 최대값

    IP_ADAPTER_ADDRESSES* adapter = adapters;
    while (adapter) {
        if (adapter->OperStatus != IfOperStatusUp ||
            adapter->PhysicalAddressLength == 0 ||
            adapter->FirstGatewayAddress == NULL ||
            !isPhysicalAdapter(adapter->Description)) {
            adapter = adapter->Next;
            continue;
        }

        if (adapter->Ipv4Metric < bestMetric) {
            best = adapter;
            bestMetric = adapter->Ipv4Metric;
        }

        adapter = adapter->Next;
    }

    if (best) {
        printf("선택된 어댑터: %ws\n", best->FriendlyName);
        printf("MAC 주소: ");
        for (UINT i = 0; i < best->PhysicalAddressLength; ++i) {
            printf("%02X", best->PhysicalAddress[i]);
            if (i != best->PhysicalAddressLength - 1)
                printf("-");
        }

        printf("\n기본 게이트웨이: ");
        SOCKADDR* sa = best->FirstGatewayAddress->Address.lpSockaddr;
        char ipstr[INET6_ADDRSTRLEN] = {0};
        getnameinfo(sa,
                    (sa->sa_family == AF_INET) ? sizeof(SOCKADDR_IN) : sizeof(SOCKADDR_IN6),
                    ipstr, sizeof(ipstr),
                    NULL, 0, NI_NUMERICHOST);
        printf("%s\n", ipstr);
    } else {
        printf("조건에 맞는 어댑터를 찾을 수 없습니다.\n");
    }

    free(adapters);
    return 0;
}
