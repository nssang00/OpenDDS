#include <iphlpapi.h>
#include <iostream>
#pragma comment(lib, "iphlpapi.lib")

int main() {
    ULONG bufferSize = 0;
    GetAdaptersAddresses(AF_UNSPEC, 0, nullptr, nullptr, &bufferSize);
    std::vector<BYTE> buffer(bufferSize);
    PIP_ADAPTER_ADDRESSES pAddresses = (PIP_ADAPTER_ADDRESSES)buffer.data();

    if (GetAdaptersAddresses(AF_UNSPEC, 0, nullptr, pAddresses, &bufferSize) == NO_ERROR) {
        for (PIP_ADAPTER_ADDRESSES adapter = pAddresses; adapter; adapter = adapter->Next) {
            if (adapter->PhysicalAddressLength == 6) {
                printf("MAC: ");
                for (ULONG i = 0; i < adapter->PhysicalAddressLength; i++) {
                    printf("%02X%s", adapter->PhysicalAddress[i], (i < 5) ? "-" : "");
                }
                printf("\n");
            }
        }
    }
}
