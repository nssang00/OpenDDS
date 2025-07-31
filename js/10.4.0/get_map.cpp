#include <winsock2.h>
#include <iphlpapi.h>
#include <stdio.h>
#include <tchar.h>

#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "ws2_32.lib")

bool IsVirtualAdapter(const char* desc) {
    if (!desc) return false;
    return strstr(desc, "Virtual") || strstr(desc, "VMware") || strstr(desc, "Hyper-V") || strstr(desc, "Loopback");
}

void PrintActivePhysicalAdapters() {
    ULONG bufferSize = 0;
    GetAdaptersAddresses(AF_UNSPEC, GAA_FLAG_INCLUDE_PREFIX, NULL, NULL, &bufferSize);

    IP_ADAPTER_ADDRESSES* pAddresses = (IP_ADAPTER_ADDRESSES*)malloc(bufferSize);
    if (GetAdaptersAddresses(AF_UNSPEC, GAA_FLAG_INCLUDE_PREFIX, NULL, pAddresses, &bufferSize) == NO_ERROR) {
        for (IP_ADAPTER_ADDRESSES* adapter = pAddresses; adapter != NULL; adapter = adapter->Next) {
            // 조건 1: 활성화된 어댑터
            if (adapter->OperStatus != IfOperStatusUp)
                continue;

            // 조건 2: 가상 어댑터가 아님
            if (IsVirtualAdapter(adapter->Description))
                continue;

            // 조건 3: 디폴트 게이트웨이가 있음
            if (adapter->FirstGatewayAddress == NULL)
                continue;

            printf("Adapter Name : %s\n", adapter->AdapterName);
            printf("Description  : %s\n", adapter->Description);

            printf("MAC Address  : ");
            for (UINT i = 0; i < adapter->PhysicalAddressLength; i++) {
                if (i) printf("-");
                printf("%02X", adapter->PhysicalAddress[i]);
            }
            printf("\n\n");
        }
    } else {
        printf("GetAdaptersAddresses failed.\n");
    }

    free(pAddresses);
}

int main() {
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) == 0) {
        PrintActivePhysicalAdapters();
        WSACleanup();
    } else {
        printf("WSAStartup failed.\n");
    }

    return 0;
}
