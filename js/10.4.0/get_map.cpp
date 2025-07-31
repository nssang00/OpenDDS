#include <winsock2.h>
#include <iphlpapi.h>
#include <ws2tcpip.h>
#include <iostream>
#include <vector>
#include <string.h>

#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "ws2_32.lib")

// 가상 어댑터 여부 검사
bool IsVirtualAdapter(const char* desc) {
    if (!desc) return false;
    return strstr(desc, "Virtual") || strstr(desc, "VMware") || strstr(desc, "Hyper-V") || strstr(desc, "Loopback") || strstr(desc, "TAP");
}

int main() {
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        std::cerr << "WSAStartup failed.\n";
        return 1;
    }

    // 어댑터 정보 조회
    ULONG bufferSize = 0;
    DWORD result = GetAdaptersAddresses(
        AF_UNSPEC,
        GAA_FLAG_INCLUDE_GATEWAYS,
        NULL,
        NULL,
        &bufferSize
    );

    if (result != ERROR_BUFFER_OVERFLOW) {
        std::cerr << "GetAdaptersAddresses failed: " << result << "\n";
        WSACleanup();
        return 1;
    }

    PIP_ADAPTER_ADDRESSES adapterAddresses = (PIP_ADAPTER_ADDRESSES)malloc(bufferSize);
    if (!adapterAddresses) {
        std::cerr << "Memory allocation failed.\n";
        WSACleanup();
        return 1;
    }

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
        // 1. 활성 어댑터만 처리
        if (adapter->OperStatus != IfOperStatusUp) continue;

        // 2. 가상 어댑터 필터링
        char descA[256] = {0};
        WideCharToMultiByte(CP_ACP, 0, adapter->Description, -1, descA, sizeof(descA), NULL, NULL);
        if (IsVirtualAdapter(descA)) continue;

        // 3. 디폴트 게이트웨이 존재 여부 확인 (IPv4/IPv6 둘 다 허용)
        PIP_ADAPTER_GATEWAY_ADDRESS_LH gateway = adapter->FirstGatewayAddress;
        bool hasGateway = false;
        while (gateway != NULL) {
            if (gateway->Address.lpSockaddr != NULL) {
                hasGateway = true;
                break;
            }
            gateway = gateway->Next;
        }
        if (!hasGateway) continue;

        // MAC 주소 출력
        std::cout << "Adapter: " << descA << std::endl;
        std::cout << "  MAC Address: ";
        for (UINT i = 0; i < adapter->PhysicalAddressLength; i++) {
            if (i) std::cout << "-";
            printf("%02X", adapter->PhysicalAddress[i]);
        }
        std::cout << std::endl;

        // 디폴트 게이트웨이(모두 출력)
        gateway = adapter->FirstGatewayAddress;
        while (gateway != NULL) {
            char gatewayStr[INET6_ADDRSTRLEN];
            DWORD gatewaySize = sizeof(gatewayStr);
            if (WSAAddressToStringA(
                gateway->Address.lpSockaddr,
                gateway->Address.iSockaddrLength,
                NULL,
                gatewayStr,
                &gatewaySize
            ) == 0) {
                std::cout << "  Default Gateway: " << gatewayStr << std::endl;
            }
            gateway = gateway->Next;
        }
        std::cout << std::endl;
    }

    free(adapterAddresses);
    WSACleanup();
    return 0;
}
