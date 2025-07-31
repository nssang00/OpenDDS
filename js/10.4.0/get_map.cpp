#include <winsock2.h>
#include <iphlpapi.h>
#include <ws2tcpip.h>
#include <iostream>
#include <vector>

#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "ws2_32.lib")

int main() {
    // 초기화
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        std::cerr << "WSAStartup failed.\n";
        return 1;
    }

    // 어댑터 정보 조회
    ULONG bufferSize = 0;
    DWORD result = GetAdaptersAddresses(
        AF_UNSPEC,                      // IPv4 + IPv6
        GAA_FLAG_INCLUDE_GATEWAYS,      // 게이트웨이 포함
        NULL,
        NULL,
        &bufferSize
    );

    if (result != ERROR_BUFFER_OVERFLOW) {
        std::cerr << "GetAdaptersAddresses failed: " << result << "\n";
        WSACleanup();
        return 1;
    }

    // 버퍼 할당
    PIP_ADAPTER_ADDRESSES adapterAddresses = (PIP_ADAPTER_ADDRESSES)malloc(bufferSize);
    if (!adapterAddresses) {
        std::cerr << "Memory allocation failed.\n";
        WSACleanup();
        return 1;
    }

    // 실제 정보 가져오기
    result = GetAdaptersAddresses(
        AF_UNSPEC,
        GAA_FLAG_INCLUDE_GATEWAYS,
        NULL,
        adapterAddresses,
        &bufferSize
    );

    if (result != ERROR_SUCCESS) {
        std::cerr << "GetAdaptersAddresses failed: " << result << "\n";
        free(adapterAddresses);
        WSACleanup();
        return 1;
    }

    // 어댑터 순회
    for (PIP_ADAPTER_ADDRESSES adapter = adapterAddresses; adapter != NULL; adapter = adapter->Next) {
        // 활성 어댑터만 처리
        if (adapter->OperStatus != IfOperStatusUp) continue;

        std::cout << "Adapter: " << adapter->FriendlyName << "\n";

        // IP 주소 출력
        PIP_ADAPTER_UNICAST_ADDRESS unicast = adapter->FirstUnicastAddress;
        while (unicast != NULL) {
            char ipStr[INET6_ADDRSTRLEN];
            DWORD ipStrSize = sizeof(ipStr);
            if (WSAAddressToStringA(
                unicast->Address.lpSockaddr,
                unicast->Address.iSockaddrLength,
                NULL,
                ipStr,
                &ipStrSize
            ) == 0) {
                std::cout << "  IP Address: " << ipStr << "\n";
            }
            unicast = unicast->Next;
        }

        // 기본 게이트웨이 출력
        PIP_ADAPTER_GATEWAY_ADDRESS_LH gateway = adapter->FirstGatewayAddress;
        if (gateway != NULL) {
            char gatewayStr[INET6_ADDRSTRLEN];
            DWORD gatewaySize = sizeof(gatewayStr);
            if (WSAAddressToStringA(
                gateway->Address.lpSockaddr,
                gateway->Address.iSockaddrLength,
                NULL,
                gatewayStr,
                &gatewaySize
            ) == 0) {
                std::cout << "  Default Gateway: " << gatewayStr << "\n";
            }
        }

        std::cout << "\n";
    }

    // 정리
    free(adapterAddresses);
    WSACleanup();
    return 0;
}
