#include <iostream>
#include <iphlpapi.h>
#include <ws2tcpip.h>
#pragma comment(lib, "iphlpapi.lib")

void PrintPrimaryMacAddress() {
    ULONG bufferSize = 0;
    GetAdaptersAddresses(AF_UNSPEC, GAA_FLAG_INCLUDE_PREFIX, nullptr, nullptr, &bufferSize);

    IP_ADAPTER_ADDRESSES* adapters = (IP_ADAPTER_ADDRESSES*)malloc(bufferSize);
    if (GetAdaptersAddresses(AF_UNSPEC, GAA_FLAG_INCLUDE_PREFIX, nullptr, adapters, &bufferSize) != NO_ERROR) {
        std::cerr << "GetAdaptersAddresses failed\n";
        free(adapters);
        return;
    }

    IP_ADAPTER_ADDRESSES* best = nullptr;
    ULONG bestMetric = ULONG_MAX;

    for (IP_ADAPTER_ADDRESSES* aa = adapters; aa != nullptr; aa = aa->Next) {
        if (aa->OperStatus != IfOperStatusUp) continue;
        if (aa->IfType == IF_TYPE_SOFTWARE_LOOPBACK) continue;
        if (aa->PhysicalAddressLength == 0) continue;

        // Prefer lower metric (Windows uses this for route selection)
        if (aa->Ipv4Metric < bestMetric) {
            best = aa;
            bestMetric = aa->Ipv4Metric;
        }
    }

    if (best) {
        std::cout << "대표 인터페이스: " << best->FriendlyName << "\n";
        std::cout << "MAC 주소: ";
        for (ULONG i = 0; i < best->PhysicalAddressLength; ++i) {
            printf("%02X", best->PhysicalAddress[i]);
            if (i < best->PhysicalAddressLength - 1)
                printf("-");
        }
        std::cout << std::endl;
    } else {
        std::cout << "사용 중인 물리 네트워크 어댑터를 찾을 수 없습니다.\n";
    }

    free(adapters);
}

int main() {
    PrintPrimaryMacAddress();
    return 0;
}
