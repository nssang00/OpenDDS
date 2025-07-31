#include <iostream>
#include <iphlpapi.h>
#include <ws2tcpip.h>
#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "ws2_32.lib")

bool isPhysicalAdapter(const std::string& desc) {
    std::string lowerDesc = desc;
    for (char& c : lowerDesc) c = tolower(c);
    return lowerDesc.find("virtual") == std::string::npos &&
           lowerDesc.find("vmware") == std::string::npos &&
           lowerDesc.find("hyper-v") == std::string::npos &&
           lowerDesc.find("loopback") == std::string::npos &&
           lowerDesc.find("bluetooth") == std::string::npos;
}

int main() {
    DWORD size = 0;
    GetAdaptersAddresses(AF_UNSPEC, GAA_FLAG_INCLUDE_PREFIX, nullptr, nullptr, &size);
    IP_ADAPTER_ADDRESSES* adapters = reinterpret_cast<IP_ADAPTER_ADDRESSES*>(malloc(size));

    if (GetAdaptersAddresses(AF_UNSPEC, GAA_FLAG_INCLUDE_PREFIX, nullptr, adapters, &size) != NO_ERROR) {
        std::cerr << "GetAdaptersAddresses failed\n";
        free(adapters);
        return 1;
    }

    IP_ADAPTER_ADDRESSES* bestAdapter = nullptr;
    ULONG bestMetric = ULONG_MAX;

    for (IP_ADAPTER_ADDRESSES* adapter = adapters; adapter != nullptr; adapter = adapter->Next) {
        if (!(adapter->OperStatus == IfOperStatusUp)) continue;
        if (adapter->PhysicalAddressLength == 0) continue;
        if (!adapter->FirstGatewayAddress) continue; // no default gateway
        if (!isPhysicalAdapter(adapter->Description)) continue;

        if (adapter->Ipv4Metric < bestMetric) {
            bestMetric = adapter->Ipv4Metric;
            bestAdapter = adapter;
        }
    }

    if (bestAdapter) {
        printf("선택된 어댑터: %ws\n", bestAdapter->FriendlyName);
        printf("MAC 주소: ");
        for (UINT i = 0; i < bestAdapter->PhysicalAddressLength; ++i) {
            printf("%02X", bestAdapter->PhysicalAddress[i]);
            if (i != bestAdapter->PhysicalAddressLength - 1)
                printf("-");
        }
        printf("\n기본 게이트웨이: ");
        SOCKADDR* addr = bestAdapter->FirstGatewayAddress->Address.lpSockaddr;
        char ipStr[INET6_ADDRSTRLEN];
        getnameinfo(addr, (addr->sa_family == AF_INET) ? sizeof(sockaddr_in) : sizeof(sockaddr_in6),
                    ipStr, sizeof(ipStr), nullptr, 0, NI_NUMERICHOST);
        printf("%s\n", ipStr);
    } else {
        printf("조건에 맞는 어댑터를 찾을 수 없습니다.\n");
    }

    free(adapters);
    return 0;
}
