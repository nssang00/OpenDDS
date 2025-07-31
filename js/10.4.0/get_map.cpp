#include <winsock2.h>
#include <iphlpapi.h>
#include <iostream>
#include <vector>
#include <iomanip>
#include <string>
#include <algorithm>
#include <cwctype>

#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "ws2_32.lib")

// 어댑터 설명을 분석하여 가상 어댑터 여부 판단
bool IsVirtualAdapter(const wchar_t* description) {
    if (!description) return true;

    std::wstring desc(description);
    std::transform(desc.begin(), desc.end(), desc.begin(), 
        [](wchar_t c) { return std::towlower(c); });

    // 가상 어댑터 키워드 목록
    const std::vector<std::wstring> virtualKeywords = {
        L"virtual", L"hyper-v", L"vmware", L"vpn", 
        L"tunnel", L"teredo", L"pseudo", L"microsoft",
        L"ppp", L"tap", L"wireguard", L"openvpn",
        L"loopback", L"npcap", L"winpcap", L"radmin"
    };

    for (const auto& keyword : virtualKeywords) {
        if (desc.find(keyword) != std::wstring::npos) {
            return true;
        }
    }
    return false;
}

int main() {
    // 1. 어댑터 주소 정보 가져오기
    ULONG bufferSize = 0;
    DWORD result = GetAdaptersAddresses(
        AF_UNSPEC,
        GAA_FLAG_INCLUDE_GATEWAYS,
        NULL,
        NULL,
        &bufferSize
    );

    if (result != ERROR_BUFFER_OVERFLOW) {
        std::cerr << "GetAdaptersAddresses failed: " << result << std::endl;
        return 1;
    }

    PIP_ADAPTER_ADDRESSES pAddresses = (PIP_ADAPTER_ADDRESSES)malloc(bufferSize);
    result = GetAdaptersAddresses(
        AF_UNSPEC,
        GAA_FLAG_INCLUDE_GATEWAYS,
        NULL,
        pAddresses,
        &bufferSize
    );

    if (result != ERROR_SUCCESS) {
        std::cerr << "GetAdaptersAddresses failed: " << result << std::endl;
        free(pAddresses);
        return 1;
    }

    // 2. 라우팅 테이블 가져오기
    PMIB_IPFORWARDTABLE pIpForwardTable = NULL;
    DWORD tableSize = 0;
    if (GetIpForwardTable(NULL, &tableSize, TRUE) != ERROR_INSUFFICIENT_BUFFER) {
        std::cerr << "GetIpForwardTable size failed" << std::endl;
        free(pAddresses);
        return 1;
    }

    pIpForwardTable = (PMIB_IPFORWARDTABLE)malloc(tableSize);
    if (GetIpForwardTable(pIpForwardTable, &tableSize, TRUE) != NO_ERROR) {
        std::cerr << "GetIpForwardTable failed" << std::endl;
        free(pAddresses);
        free(pIpForwardTable);
        return 1;
    }

    // 3. 가장 낮은 메트릭의 기본 게이트웨이 찾기
    DWORD bestMetric = 0xFFFFFFFF;
    DWORD bestInterfaceIndex = 0;
    ULONG bestGateway = 0;

    for (DWORD i = 0; i < pIpForwardTable->dwNumEntries; i++) {
        MIB_IPFORWARDROW& row = pIpForwardTable->table[i];
        
        // 기본 게이트웨이 확인 (목적지 0.0.0.0)
        if (row.dwForwardDest == 0) {
            // 메트릭 비교 (낮을수록 우선순위 높음)
            if (row.dwForwardMetric1 < bestMetric) {
                bestMetric = row.dwForwardMetric1;
                bestInterfaceIndex = row.dwForwardIfIndex;
                bestGateway = row.dwForwardNextHop;
            }
        }
    }

    // 4. 해당 인터페이스의 어댑터 정보 출력
    PIP_ADAPTER_ADDRESSES pCurrent = pAddresses;
    bool found = false;

    while (pCurrent) {
        // 가상 어댑터 검출
        bool isVirtual = IsVirtualAdapter(pCurrent->Description);

        // 필터링 조건
        if (pCurrent->OperStatus == IfOperStatusUp &&          // 활성 상태
            pCurrent->IfType != IF_TYPE_SOFTWARE_LOOPBACK &&  // 루프백 제외
            !(pCurrent->Flags & IP_ADAPTER_NO_PHYSICAL_ADDRESS) && // 물리적 주소 존재
            !isVirtual &&                                     // 가상 어댑터 제외
            pCurrent->IfIndex == bestInterfaceIndex)          // 메트릭 최저 인터페이스
        {
            char friendlyName[256];
            WideCharToMultiByte(CP_ACP, 0, pCurrent->FriendlyName, -1,
                friendlyName, sizeof(friendlyName), NULL, NULL);

            char desc[256];
            WideCharToMultiByte(CP_ACP, 0, pCurrent->Description, -1,
                desc, sizeof(desc), NULL, NULL);

            std::cout << "\n=== Selected Network Adapter ===" << std::endl;
            std::cout << "Description: " << desc << std::endl;
            std::cout << "Friendly Name: " << friendlyName << std::endl;
            std::cout << "Interface Index: " << pCurrent->IfIndex << std::endl;
            std::cout << "MAC Address: ";
            for (DWORD i = 0; i < pCurrent->PhysicalAddressLength; i++) {
                printf("%02X", pCurrent->PhysicalAddress[i]);
                if (i < pCurrent->PhysicalAddressLength - 1) std::cout << "-";
            }
            std::cout << std::endl;

            // IPv4 주소 출력
            PIP_ADAPTER_UNICAST_ADDRESS_LH pUnicast = pCurrent->FirstUnicastAddress;
            while (pUnicast) {
                if (pUnicast->Address.lpSockaddr->sa_family == AF_INET) {
                    SOCKADDR_IN* ipv4 = (SOCKADDR_IN*)pUnicast->Address.lpSockaddr;
                    std::cout << "IPv4 Address: " << inet_ntoa(ipv4->sin_addr) << std::endl;
                }
                pUnicast = pUnicast->Next;
            }

            // 게이트웨이 정보 출력
            if (bestGateway != 0) {
                SOCKADDR_IN gatewayAddr;
                gatewayAddr.sin_addr.s_addr = bestGateway;
                gatewayAddr.sin_family = AF_INET;
                std::cout << "Default Gateway: " << inet_ntoa(gatewayAddr.sin_addr) << std::endl;
            } else {
                std::cout << "Default Gateway: Not Found" << std::endl;
            }

            std::cout << "Interface Metric: " << bestMetric << std::endl;
            found = true;
            break;
        }
        pCurrent = pCurrent->Next;
    }

    if (!found) {
        std::cout << "No active physical adapter with default gateway found." << std::endl;
    }

    // 5. 정리
    free(pAddresses);
    free(pIpForwardTable);
    return 0;
}
