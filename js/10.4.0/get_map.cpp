// 헤더 포함 순서 매우 중요!
#include <winsock2.h>      // winsock2를 가장 먼저!
#include <ws2tcpip.h>
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <iphlpapi.h>
#include <intrin.h>
#include <comdef.h>
#include <Wbemidl.h>
#include <wincrypt.h>
#include <iostream>
#include <string>
#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "wbemuuid.lib")
#pragma comment(lib, "crypt32.lib")
#pragma comment(lib, "ws2_32.lib")

// AF_IPX 매크로 재정의 (충돌 방지)
#ifdef AF_IPX
#undef AF_IPX
#endif
#define AF_IPX 9999  // 원하는 값으로 재정의

// SHA256 해시 함수 (바이너리 결과 반환)
std::string sha256(const std::string& input) {
    HCRYPTPROV hProv = 0;
    HCRYPTHASH hHash = 0;
    BYTE hash[32];
    DWORD hashLen = sizeof(hash);
    std::string result;
    if (CryptAcquireContext(&hProv, nullptr, nullptr, PROV_RSA_AES, CRYPT_VERIFYCONTEXT) &&
        CryptCreateHash(hProv, CALG_SHA_256, 0, 0, &hHash) &&
        CryptHashData(hHash, (BYTE*)input.c_str(), input.length(), 0) &&
        CryptGetHashParam(hHash, HP_HASHVAL, hash, &hashLen, 0)) {
        for (DWORD i = 0; i < hashLen; ++i)
            result += static_cast<char>(hash[i]);
    }
    if (hHash) CryptDestroyHash(hHash);
    if (hProv) CryptReleaseContext(hProv, 0);
    return result;
}

// 6자리 숫자 코드 생성
int extract6DigitCode(const std::string& hash) {
    uint32_t value = 0;
    for (int i = 0; i < 4 && i < hash.size(); ++i)
        value = (value << 8) | static_cast<unsigned char>(hash[i]);
    return value % 1000000;
}

// MAC 주소 (활성/실제/이더넷) 가져오기
std::string getMacAddress() {
    IP_ADAPTER_INFO adapterInfo[16];
    DWORD buflen = sizeof(adapterInfo);
    if (GetAdaptersInfo(adapterInfo, &buflen) != NO_ERROR) return "";
    PIP_ADAPTER_INFO pAdapter = adapterInfo;
    while (pAdapter) {
        // 비활성/가상/루프백/기본 게이트웨이 없는 어댑터는 제외
        if (pAdapter->Type == MIB_IF_TYPE_ETHERNET &&
            pAdapter->AddressLength == 6 &&
            pAdapter->DhcpEnabled && // DHCP 사용(네트워크 실제 사용중)
            pAdapter->GatewayList.IpAddress.String[0] != '0') // 기본 게이트웨이 존재
        {
            char mac[18];
            sprintf_s(mac, "%02X:%02X:%02X:%02X:%02X:%02X",
                      pAdapter->Address[0], pAdapter->Address[1], pAdapter->Address[2],
                      pAdapter->Address[3], pAdapter->Address[4], pAdapter->Address[5]);
            return std::string(mac);
        }
        pAdapter = pAdapter->Next;
    }
    return "";
}

// CPU ID 가져오기
std::string getCpuId() {
    int cpuInfo[4] = { -1 };
    __cpuid(cpuInfo, 0);
    char id[13];
    memcpy(id, &cpuInfo[1], 4); // EBX
    memcpy(id + 4, &cpuInfo[3], 4); // EDX
    memcpy(id + 8, &cpuInfo[2], 4); // ECX
    id[12] = '\0';
    return std::string(id);
}

// WMI 쿼리 유틸리티 (BIOS/HDD 등)
std::string queryWMI(const std::wstring& className, const std::wstring& propName) {
    HRESULT hres;
    std::string result;
    hres = CoInitializeEx(0, COINIT_MULTITHREADED);
    if (FAILED(hres) && hres != RPC_E_CHANGED_MODE) return "";
    hres = CoInitializeSecurity(NULL, -1, NULL, NULL,
        RPC_C_AUTHN_LEVEL_DEFAULT, RPC_C_IMP_LEVEL_IMPERSONATE,
        NULL, EOAC_NONE, NULL);
    IWbemLocator* pLocator = nullptr;
    hres = CoCreateInstance(CLSID_WbemLocator, 0, CLSCTX_INPROC_SERVER,
        IID_IWbemLocator, (LPVOID*)&pLocator);
    if (FAILED(hres)) return "";
    IWbemServices* pServices = nullptr;
    hres = pLocator->ConnectServer(
        _bstr_t(L"ROOT\\CIMV2"), NULL, NULL, 0, NULL, 0, 0, &pServices);
    if (FAILED(hres)) return "";
    hres = CoSetProxyBlanket(pServices, RPC_C_AUTHN_WINNT, RPC_C_AUTHZ_NONE,
        NULL, RPC_C_AUTHN_LEVEL_CALL, RPC_C_IMP_LEVEL_IMPERSONATE, NULL, EOAC_NONE);
    IEnumWbemClassObject* pEnumerator = nullptr;
    hres = pServices->ExecQuery(
        bstr_t("WQL"),
        bstr_t(std::wstring(L"SELECT * FROM " + className).c_str()),
        WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY,
        NULL, &pEnumerator);
    if (FAILED(hres)) return "";
    IWbemClassObject* pObj = nullptr;
    ULONG uReturn = 0;
    if (pEnumerator && pEnumerator->Next(WBEM_INFINITE, 1, &pObj, &uReturn) == S_OK) {
        VARIANT vtProp;
        if (SUCCEEDED(pObj->Get(propName.c_str(), 0, &vtProp, 0, 0)) && vtProp.vt == VT_BSTR) {
            result = _bstr_t(vtProp.bstrVal);
            VariantClear(&vtProp);
        }
        pObj->Release();
    }
    if (pEnumerator) pEnumerator->Release();
    if (pServices) pServices->Release();
    if (pLocator) pLocator->Release();
    CoUninitialize();
    return result;
}

int main() {
    std::string mac = getMacAddress();
    std::string cpu = getCpuId();
    std::string bios = queryWMI(L"Win32_BIOS", L"SerialNumber");
    std::string disk = queryWMI(L"Win32_PhysicalMedia", L"SerialNumber");

    std::string combined = mac + cpu + bios + disk;
    std::string hash = sha256("MYAPP_SALT_" + combined); // SALT는 임의로 교체 가능!
    int code = extract6DigitCode(hash);

    std::cout << "AF_IPX: " << AF_IPX << std::endl;
    std::cout << "인증 코드: " << std::setfill('0') << std::setw(6) << code << std::endl;

    return 0;
}
