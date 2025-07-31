#define _WIN32_WINNT 0x0600
#include <winsock2.h>
#include <iphlpapi.h>
#include <windows.h>
#include <iostream>

#pragma comment(lib, "iphlpapi.lib")

int main() {
    ULONG bufferSize = 15000;
    IP_ADAPTER_ADDRESSES* pAddrs = (IP_ADAPTER_ADDRESSES*)malloc(bufferSize);

    DWORD result = GetAdaptersAddresses(AF_UNSPEC, 0, NULL, pAddrs, &bufferSize);
    if (result == NO_ERROR) {
        for (IP_ADAPTER_ADDRESSES* adapter = pAddrs; adapter != NULL; adapter = adapter->Next) {
            if (adapter->PhysicalAddressLength > 0) {
                std::cout << "MAC: ";
                for (DWORD i = 0; i < adapter->PhysicalAddressLength; ++i) {
                    printf("%02X%s", adapter->PhysicalAddress[i], (i < adapter->PhysicalAddressLength - 1) ? "-" : "\n");
                }
                break; // 하나만 출력
            }
        }
    } else {
        std::cerr << "GetAdaptersAddresses failed." << std::endl;
    }

    free(pAddrs);
    return 0;
}
