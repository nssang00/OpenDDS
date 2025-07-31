#define WIN32_LEAN_AND_MEAN
#include <winsock2.h>
#include <ws2tcpip.h>
#include <iphlpapi.h>
#include <windows.h>
#include <iostream>
#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "ws2_32.lib")

int main() {
    ULONG bufferSize = 0;
    GetAdaptersAddresses(AF_UNSPEC, 0, nullptr, nullptr, &bufferSize);
    std::vector<BYTE> buffer(bufferSize);
    PIP_ADAPTER_ADDRESSES pAddresses = (PIP_ADAPTER_ADDRESSES)buffer.data();

    if (GetAdaptersAddresses(AF_UNSPEC, 0, nullptr, pAddresses, &bufferSize) == NO_ERROR) {
        for (PIP_ADAPTER_ADDRESSES adapter = pAddresses; adapter; adapter = adapter->Next) {
            if (adapter->PhysicalAddressLength == 6) {
                std::cout << "MAC Address: ";
                for (ULONG i = 0; i < adapter->PhysicalAddressLength; i++) {
                    printf("%02X%s", adapter->PhysicalAddress[i], (i < 5) ? "-" : "");
                }
                std::cout << std::endl;
            }
        }
    }
    return 0;
}
