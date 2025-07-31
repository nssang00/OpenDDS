#include <iostream>
#include <iphlpapi.h>
#include <windows.h>
#include <tchar.h>

#pragma comment(lib, "iphlpapi.lib")

bool IsPhysicalAdapter(const IP_ADAPTER_ADDRESSES* adapter) {
    // 가상 어댑터는 Description 또는 FriendlyName에 "virtual", "VMware", "loopback" 등을 포함할 수 있음
    std::wstring desc = adapter->Description;
    std::wstring friendly = adapter->FriendlyName;
    for (auto& str : {desc, friendly}) {
        for (auto& c : str) c = towlower(c);
        if (str.find(L"virtual") != std::wstring::npos ||
            str.find(L"vmware") != std::wstring::npos ||
            str.find(L"loopback") != std::wstring::npos)
            return false;
    }
    return true;
}

void PrintMacAddress(const BYTE* addr, DWORD len) {
    for (DWORD i = 0; i < len; i++) {
        if (i > 0) std::cout << "-";
        printf("%02X", addr[i]);
    }
    std::cout << std::endl;
}

int main() {
    ULONG outBufLen = 15000;
    IP_ADAPTER_ADDRESSES* adapterAddresses = (IP_ADAPTER_ADDRESSES*)malloc(outBufLen);

    if (GetAdaptersAddresses(AF_UNSPEC, GAA_FLAG_INCLUDE_PREFIX, NULL, adapterAddresses, &outBufLen) == NO_ERROR) {
        IP_ADAPTER_ADDRESSES* adapter = adapterAddresses;

        while (adapter) {
            if (adapter->PhysicalAddressLength != 0 &&
                (adapter->IfType != IF_TYPE_SOFTWARE_LOOPBACK) &&
                (adapter->OperStatus == IfOperStatusUp) &&
                IsPhysicalAdapter(adapter)) {

                std::wcout << L"Adapter: " << adapter->FriendlyName << std::endl;
                std::cout << "MAC: ";
                PrintMacAddress(adapter->PhysicalAddress, adapter->PhysicalAddressLength);
                break; // 대표 어댑터 하나만 출력
            }
            adapter = adapter->Next;
        }
    } else {
        std::cerr << "GetAdaptersAddresses failed." << std::endl;
    }

    free(adapterAddresses);
    return 0;
}
