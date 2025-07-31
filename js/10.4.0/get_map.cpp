#include <winsock2.h>
#include <iphlpapi.h>
#include <ws2tcpip.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <windows.h>

#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "ws2_32.lib")

#ifndef GAA_FLAG_INCLUDE_PREFIX
#define GAA_FLAG_INCLUDE_PREFIX 0x00000010
#endif

// 가상 어댑터 판단 함수 (Wi-Fi는 제외)
bool IsVirtualAdapter(const char* desc) {
    if (!desc) return false;
    return strstr(desc, "Loopback") || strstr(desc, "Virtual") || strstr(desc, "Hyper-V") || strstr(desc, "TAP");
}

// IPv4 게이트웨이 존재 여부 확인
bool HasValidIPv4Gateway(IP_ADAPTER_ADDRESSES* adapter) {
    IP_ADAPTER_GATEWAY_ADDRESS_LH* gw = adapter->FirstGatewayAddress;
    while (gw != NULL) {
        SOCKADDR* sa = gw->Address.lpSockaddr;
        if (sa && sa->sa_family == AF_INET) {
            return true;
        }
        gw = gw->Next;
    }
    return false;
}

// 게이트웨이 IP 출력 (IPv4 + IPv6)
void PrintGatewayAddresses(IP_ADAPTER_ADDRESSES* adapter) {
    IP_ADAPTER_GATEWAY_ADDRESS_LH* gw = adapter->FirstGatewayAddress;
    int gwIndex = 0;
    while (gw != NULL) {
        SOCKADDR* sa = gw->Address.lpSockaddr;
        if (sa) {
            printf("  [Gateway %d] ", gwIndex);
            if (sa->sa_family == AF_INET) {
                SOCKADDR_IN* ipv4 = (SOCKADDR_IN*)sa;
                char ip[INET_ADDRSTRLEN];
                inet_ntop(AF_INET, &(ipv4->sin_addr), ip, sizeof(ip));
                printf("IPv4: %s\n", ip);
            } else if (sa->sa_family == AF_INET6) {
                SOCKADDR_IN6* ipv6 = (SOCKADDR_IN6*)sa;
                char ip[INET6_ADDRSTRLEN];
                inet_ntop(AF_INET6, &(ipv6->sin6_addr), ip, sizeof(ip));
                printf("IPv6: %s\n", ip);
            } else {
                printf("Unknown address family: %d\n", sa->sa_family);
            }
        }
        gw = gw->Next;
        gwIndex++;
    }
}

void PrintAdaptersWithGateway() {
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

        printf("AdapterName: %s\n", adapter->AdapterName);

        // 어댑터 설명 변환
        char descA[256] = {0};
        WideCharToMultiByte(CP_ACP, 0, adapter->Description, -1, descA, sizeof(descA), NULL, NULL);
        printf("Description: %s\n", descA);

        // 게이트웨이 출력
        printf("디폴트 게이트웨이 주소:\n");
        PrintGatewayAddresses(adapter);

        // IPv4 게이트웨이 존재 여부
        if (!HasValidIPv4Gateway(adapter)) {
            printf("-- 필터됨: 유효한 IPv4 디폴트 게이트웨이 없음\n");
            continue;
        } else {
            printf("OK: IPv4 디폴트 게이트웨이 존재\n");
        }

        // 가상 어댑터 필터링
        if (IsVirtualAdapter(descA)) {
            printf("-- 필터됨: 가상 어댑터로 판단됨\n");
            continue;
        } else {
            printf("OK: 물리적 어댑터로 판단됨\n");
        }

        // 최종 출력
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
        PrintAdaptersWithGateway();
        WSACleanup();
    } else {
        printf("WSAStartup failed.\n");
    }

    return 0;
}
