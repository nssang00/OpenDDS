#include <winsock2.h>      // 반드시 먼저!
#include <ws2tcpip.h>
#include <windows.h>
#include <iphlpapi.h>
#include <stdio.h>
#include <string.h>
#include <ctype.h>
#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "ws2_32.lib")

#ifndef INET6_ADDRSTRLEN
#define INET6_ADDRSTRLEN 46
#endif

BOOL isPhysicalAdapter(const char* desc) {
    char lower[512];
    int i;
    memset(lower, 0, sizeof(lower));
    for (i = 0; desc[i] && i < sizeof(lower) - 1; ++i)
        lower[i] = (char)tolower(desc[i]);

    return strstr(lower, "virtual") == NULL &&
           strstr(lower, "vmware") == NULL &&
           strstr(lower, "loopback") == NULL &&
           strstr(lower, "hyper-v") == NULL &&
           strstr(lower, "bluetooth") == NULL;
}

int main() {
    ULONG bufSize = 0;
    DWORD ret;
    IP_ADAPTER_ADDRESSES* pAddrs = NULL;
    IP_ADAPTER_ADDRESSES* best = NULL;
    ULONG bestMetric = ~0U;

    // 1. 크기 확인
    ret = GetAdaptersAddresses(AF_UNSPEC, GAA_FLAG_INCLUDE_PREFIX, NULL, NULL, &bufSize);
    if (ret != ERROR_BUFFER_OVERFLOW) {
        printf("GetAdaptersAddresses 초기 호출 실패: %lu\n", ret);
        return 1;
    }

    pAddrs = (IP_ADAPTER_ADDRESSES*)malloc(bufSize);
    if (!pAddrs) {
        printf("메모리 할당 실패\n");
        return 1;
    }

    // 2. 실제 어댑터 정보 획득
    ret = GetAdaptersAddresses(AF_UNSPEC, GAA_FLAG_INCLUDE_PREFIX, NULL, pAddrs, &bufSize);
    if (ret != NO_ERROR) {
        printf("GetAdaptersAddresses 실패: %lu\n", ret);
        free(pAddrs);
        return 1;
    }

    // 3. 조건에 맞는 어댑터 선별
    {
        IP_ADAPTER_ADDRESSES* p;
        for (p = pAddrs; p != NULL; p = p->Next) {
            if (p->OperStatus != IfOperStatusUp) continue;
            if (p->PhysicalAddressLength == 0) continue;
            if (p->FirstGatewayAddress == NULL) continue;
            if (!isPhysicalAdapter(p->Description)) continue;
            // Metric 비교
            if (p->Ipv4Metric < bestMetric) {
                bestMetric = p->Ipv4Metric;
                best = p;
            }
        }
    }

    // 4. 출력
    if (best) {
        // FriendlyName (WCHAR*) → ANSI 변환 (NULL이면 AdapterName 사용)
        char friendlyName[256] = {0};
        if (best->FriendlyName && wcslen(best->FriendlyName) > 0) {
            WideCharToMultiByte(CP_ACP, 0, best->FriendlyName, -1, friendlyName, sizeof(friendlyName), NULL, NULL);
        } else {
            strncpy(friendlyName, best->AdapterName, sizeof(friendlyName) - 1);
            friendlyName[sizeof(friendlyName) - 1] = 0;
        }

        printf("선택된 어댑터 이름: %s\n", friendlyName);
        printf("설명: %s\n", best->Description);

        printf("MAC 주소: ");
        {
            UINT i;
            for (i = 0; i < best->PhysicalAddressLength; ++i) {
                printf("%02X", best->PhysicalAddress[i]);
                if (i != best->PhysicalAddressLength - 1)
                    printf("-");
            }
        }

        printf("\n기본 게이트웨이: ");
        {
            SOCKADDR* sa = best->FirstGatewayAddress->Address.lpSockaddr;
            char ipStr[INET6_ADDRSTRLEN] = {0};
            int nameret = getnameinfo(sa,
                        (sa->sa_family == AF_INET) ? sizeof(SOCKADDR_IN) : sizeof(SOCKADDR_IN6),
                        ipStr, sizeof(ipStr),
                        NULL, 0, NI_NUMERICHOST);
            if (nameret == 0)
                printf("%s\n", ipStr);
            else
                printf("(주소 변환 실패)\n");
        }
    } else {
        printf("조건에 맞는 어댑터를 찾을 수 없습니다.\n");
    }

    free(pAddrs);
    return 0;
}
