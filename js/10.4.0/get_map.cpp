#include <winsock2.h>
#include <iphlpapi.h>
#include <ws2tcpip.h>
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "ws2_32.lib")

struct AdapterInfo {
    std::string desc;
    std::string mac;
    std::string gateway;
    ULONG metric;
};

bool IsVirtualAdapter(const char* desc) {
    if (!desc) return false;
    return strstr(desc, "Virtual") || strstr(desc, "VMware") || strstr(desc, "Hyper-V") || strstr(desc, "Loopback") || strstr(desc, "TAP");
}

std::string GetMacString(PIP_ADAPTER_ADDRESSES adapter) {
    char macStr[64] = {0};
    char* p = macStr;
    for (UINT i = 0; i < adapter->PhysicalAddressLength; ++i) {
        if (i) *p++ = '-';
        sprintf(p, "%02X", adapter->PhysicalAddress[i]);
        p += 2;
    }
    return macStr;
}

// 가장 낮은 Metric의 Gateway, MAC, Description 반환
AdapterInfo GetBestAdapterWithGateway() {
    std::vector<AdapterInfo> adapterList;

    // Get adapter addresses
    ULONG bufferSize = 0;
    GetAdaptersAddresses(AF_UNSPEC, GAA_FLAG_INCLUDE_GATEWAYS, NULL, NULL, &bufferSize);
    PIP_ADAPTER_ADDRESSES adapterAddresses = (PIP_ADAPTER_ADDRESSES)malloc(bufferSize);
    if (!adapterAddresses) return {};

    DWORD result = GetAdaptersAddresses(
        AF_UNSPEC,
        GAA_FLAG_INCLUDE_GATEWAYS,
        NULL,
        adapterAddresses,
        &bufferSize
    );
    if (result != ERROR_SUCCESS) {
        free(adapterAddresses);
        return {};
    }

    for (PIP_ADAPTER_ADDRESSES adapter = adapterAddresses; adapter != NULL; adapter = adapter->Next) {
        // 1. 활성 어댑터만 처리
        if (adapter->OperStatus != IfOperStatusUp) continue;

        // 2. 가상 어댑터 필터링
        char descA[256] = {0};
        WideCharToMultiByte(CP_ACP, 0, adapter->Description, -1, descA, sizeof(descA), NULL, NULL);
        if (IsVirtualAdapter(descA)) continue;

        // 3. 디폴트 게이트웨이(여러개, Metric별 후보 저장)
        for (PIP_ADAPTER_GATEWAY_ADDRESS_LH gw = adapter->FirstGatewayAddress; gw != NULL; gw = gw->Next) {
            if (gw->Address.lpSockaddr) {
                char gatewayStr[INET6_ADDRSTRLEN] = {0};
                DWORD gatewaySize = sizeof(gatewayStr);
                if (WSAAddressToStringA(
                        gw->Address.lpSockaddr,
                        gw->Address.iSockaddrLength,
                        NULL,
                        gatewayStr,
                        &gatewaySize) == 0) {
                    // Metric은 adapter->Ipv4Metric / Ipv6Metric 사용 (IPv4, IPv6 분기)
                    ULONG metric = (gw->Address.lpSockaddr->sa_family == AF_INET)
                                       ? adapter->Ipv4Metric
                                       : adapter->Ipv6Metric;
                    adapterList.push_back(AdapterInfo{
                        descA,
                        GetMacString(adapter),
                        gatewayStr,
                        metric
                    });
                }
            }
        }
    }
    free(adapterAddresses);

    // Metric 오름차순으로 정렬 (낮을수록 우선)
    std::sort(adapterList.begin(), adapterList.end(), [](const AdapterInfo& a, const AdapterInfo& b) {
        return a.metric < b.metric;
    });

    if (!adapterList.empty())
        return adapterList.front();
    else
        return {};
}

int main() {
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        std::cerr << "WSAStartup failed.\n";
        return 1;
    }

    AdapterInfo best = GetBestAdapterWithGateway();
    if (!best.desc.empty()) {
        std::cout << "== 최우선 게이트웨이 어댑터 ==\n";
        std::cout << "Description  : " << best.desc << "\n";
        std::cout << "MAC Address  : " << best.mac << "\n";
        std::cout << "Gateway      : " << best.gateway << "\n";
        std::cout << "Metric       : " << best.metric << "\n";
    } else {
        std::cout << "조건에 맞는 어댑터를 찾을 수 없습니다.\n";
    }

    WSACleanup();
    return 0;
}
