#include <windows.h>
#include <iphlpapi.h>
#include <stdio.h>
#include <stdlib.h>

#pragma comment(lib, "iphlpapi.lib")

void PrintAdapterDescription(WCHAR* wdesc) {
    char desc[512]; // 충분한 크기의 버퍼
    int len = WideCharToMultiByte(CP_ACP, 0, wdesc, -1, desc, sizeof(desc), NULL, NULL);
    if (len > 0) {
        printf("Description  : %s\n", desc);
    } else {
        printf("Description  : <conversion failed>\n");
    }
}

bool IsVirtualAdapter(WCHAR* wdesc) {
    char desc[512];
    int len = WideCharToMultiByte(CP_ACP, 0, wdesc, -1, desc, sizeof(desc), NULL, NULL);
    if (len > 0) {
        return strstr(desc, "Virtual") || strstr(desc, "VMware") || strstr(desc, "Hyper-V") || strstr(desc, "Loopback");
    }
    return false;
}

void PrintActivePhysicalAdapters() {
    ULONG bufLen = 0;
    GetAdaptersAddresses(AF_UNSPEC, GAA_FLAG_INCLUDE_PREFIX, NULL, NULL, &bufLen);
    IP_ADAPTER_ADDRESSES* pAddrs = (IP_ADAPTER_ADDRESSES*)malloc(bufLen);
    
    if (GetAdaptersAddresses(AF_UNSPEC, GAA_FLAG_INCLUDE_PREFIX, NULL, pAddrs, &bufLen) == NO_ERROR) {
        for (IP_ADAPTER_ADDRESSES* adapter = pAddrs; adapter != NULL; adapter = adapter->Next) {
            if (adapter->OperStatus != IfOperStatusUp)
                continue;
            if (IsVirtualAdapter(adapter->Description))
                continue;
            if (adapter->FirstGatewayAddress == NULL)
                continue;

            printf("Adapter Name : %s\n", adapter->AdapterName);
            PrintAdapterDescription(adapter->Description);

            printf("MAC Address  : ");
            for (UINT i = 0; i < adapter->PhysicalAddressLength; i++) {
                if (i) printf("-");
                printf("%02X", adapter->PhysicalAddress[i]);
            }
            printf("\n\n");
        }
    }

    free(pAddrs);
}

int main() {
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2,2), &wsa) == 0) {
        PrintActivePhysicalAdapters();
        WSACleanup();
    } else {
        printf("WSAStartup failed\n");
    }
    return 0;
}
