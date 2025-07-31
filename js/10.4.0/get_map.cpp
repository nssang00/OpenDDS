#include <winsock2.h>
#include <ws2tcpip.h>
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <iphlpapi.h>
#include <intrin.h>
#include <comdef.h>
#include <Wbemidl.h>
#include <wincrypt.h>
#include <iostream>
#include <iomanip>
#include <string>
#include <vector>
#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "wbemuuid.lib")
#pragma comment(lib, "crypt32.lib")
#pragma comment(lib, "ws2_32.lib")

// SHA256 해시 함수 (바이너리 결과 반환)
std::string sha256(const std::string& input) {
    HCRYPTPROV hProv = 0;
    HCRYPTHASH hHash = 0;
    BYTE hash[32];
    DWORD hashLen = sizeof(hash);
    std::string result;
    if (CryptAcquireContext(&hProv, nullptr, nullptr, PROV_RSA_AES, CRYPT_VERIFYCONTEXT) &&
        CryptCreateHash(hProv, CALG_SHA_256, 0, 0, &hHash) &&
        CryptHashData(hHash, (BYTE*)input.c_str(), (DWORD)input.length(), 0) &&
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

// 활성/실제 MAC 주소 얻기
std::string getMacAddress() {
    ULONG flags = GAA_FLAG_INCLUDE_PREFIX;
    ULONG bufLen = 0;
    GetAdaptersAddresses(AF_UNSPEC, flags, NULL, NULL, &bufLen);
    std::vector<BYTE> buffer(bufLen);
    IP_ADAPTER_ADDRESSES* pAddresses = reinterpret_cast<IP_ADAPTER_ADDRESSES*>(buffer.data());
    if (GetAdaptersAddresses(AF_UNSPEC, flags, NULL, pAddresses, &bufLen) != NO_ERROR)
        return "";

    for (auto p = pAddresses; p; p = p->Next) {
        if ((p->IfType == IF_TYPE_ETHERNET_CSMACD || p->IfType == IF_TYPE_IEEE80211) &&
            p->PhysicalAddressLength == 6 &&
            (p->OperStatus == IfOperStatusUp)) {
            char mac[18];
            sprintf_s(mac, "%02X:%02X:%02X:%02X:%02X:%02X",
                p->PhysicalAddress[0], p->PhysicalAddress[1], p->PhysicalAddress[2],
                p->PhysicalAddress[3], p->PhysicalAddress[4], p->PhysicalAddress[5]);
            return std::string(mac);
        }
    }
    return "";
}

// CPU ID 얻기
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

// WMI로 BIOS Serial 얻기
std::string getBiosSerial() {
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
        bstr_t(L"SELECT SerialNumber FROM Win32_BIOS"),
        WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY,
        NULL, &pEnumerator);
    if (FAILED(hres)) return "";
    IWbemClassObject* pObj = nullptr;
    ULONG uReturn = 0;
    if (pEnumerator && pEnumerator->Next(WBEM_INFINITE, 1, &pObj, &uReturn) == S_OK) {
        VARIANT vtProp;
        if (SUCCEEDED(pObj->Get(L"SerialNumber", 0, &vtProp, 0, 0)) && vtProp.vt == VT_BSTR) {
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
    std::string bios = getBiosSerial();

    std::string combined = mac + cpu + bios;
    std::string hash = sha256("MYAPP_SALT_" + combined);
    int code = extract6DigitCode(hash);

    std::cout << "인증 코드: " << std::setfill('0') << std::setw(6) << code << std::endl;
    return 0;
}
