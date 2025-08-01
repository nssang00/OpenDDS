#include <windows.h>
#include <iphlpapi.h>
#include <ws2tcpip.h>
#include <wincrypt.h>
#include <iostream>
#include <string>
#include <vector>
#include <comdef.h>
#include <Wbemidl.h>

#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "ws2_32.lib")
#pragma comment(lib, "crypt32.lib")
#pragma comment(lib, "advapi32.lib")
#pragma comment(lib, "wbemuuid.lib")

bool IsVirtualAdapter(const char* desc) {
    if (!desc) return false;
    return strstr(desc, "Virtual") || strstr(desc, "VMware") || strstr(desc, "Hyper-V") ||
           strstr(desc, "Loopback") || strstr(desc, "TAP");
}

// 대표 MAC 주소 (metric 최소)
std::string GetPrimaryMacAddress() {
    ULONG bufferSize = 0;
    GetAdaptersAddresses(AF_UNSPEC, GAA_FLAG_INCLUDE_GATEWAYS, NULL, NULL, &bufferSize);
    PIP_ADAPTER_ADDRESSES adapterAddresses = (PIP_ADAPTER_ADDRESSES)malloc(bufferSize);
    if (!adapterAddresses) return "";

    DWORD result = GetAdaptersAddresses(
        AF_UNSPEC,
        GAA_FLAG_INCLUDE_GATEWAYS,
        NULL,
        adapterAddresses,
        &bufferSize
    );
    if (result != ERROR_SUCCESS) {
        free(adapterAddresses);
        return "";
    }

    PIP_ADAPTER_ADDRESSES bestAdapter = NULL;
    ULONG bestMetric = (ULONG)-1;
    for (PIP_ADAPTER_ADDRESSES adapter = adapterAddresses; adapter != NULL; adapter = adapter->Next) {
        if (adapter->OperStatus != IfOperStatusUp) continue;
        char descA[256] = {0};
        WideCharToMultiByte(CP_ACP, 0, adapter->Description, -1, descA, sizeof(descA), NULL, NULL);
        if (IsVirtualAdapter(descA)) continue;
        bool hasGateway = false;
        PIP_ADAPTER_GATEWAY_ADDRESS_LH gateway = adapter->FirstGatewayAddress;
        while (gateway != NULL) {
            if (gateway->Address.lpSockaddr != NULL) {
                hasGateway = true;
                break;
            }
            gateway = gateway->Next;
        }
        if (!hasGateway) continue;
        ULONG metric = adapter->Ipv4Metric;
        if (metric < bestMetric) {
            bestMetric = metric;
            bestAdapter = adapter;
        }
    }
    std::string mac;
    if (bestAdapter && bestAdapter->PhysicalAddressLength > 0) {
        char macStr[64] = {0};
        char* p = macStr;
        for (UINT i = 0; i < bestAdapter->PhysicalAddressLength; ++i) {
            if (i) *p++ = '-';
            sprintf(p, "%02X", bestAdapter->PhysicalAddress[i]);
            p += 2;
        }
        mac = macStr;
    }
    free(adapterAddresses);
    return mac;
}

// MachineGuid (관리자 권한 없이 레지스트리)
std::string GetMachineGuid() {
    HKEY hKey;
    if (RegOpenKeyExA(HKEY_LOCAL_MACHINE, "SOFTWARE\\Microsoft\\Cryptography", 0,
                      KEY_READ | KEY_WOW64_64KEY, &hKey) == ERROR_SUCCESS) {
        char guid[128] = {0};
        DWORD size = sizeof(guid);
        DWORD type = 0;
        if (RegQueryValueExA(hKey, "MachineGuid", NULL, &type, (LPBYTE)guid, &size) == ERROR_SUCCESS && type == REG_SZ) {
            RegCloseKey(hKey);
            return std::string(guid);
        }
        RegCloseKey(hKey);
    }
    return "";
}

// 시스템 드라이브(C:) 디스크 시리얼 (WMI, Win32_DiskDrive)
#include <windows.h>
#include <iostream>
#include <string>
#include <comdef.h>
#include <Wbemidl.h>

#pragma comment(lib, "wbemuuid.lib")

std::string GetSystemDiskSerial() {
    std::string serial;
    // 1. WMI Win32_PhysicalMedia.SerialNumber
    HRESULT hres = CoInitializeEx(0, COINIT_MULTITHREADED);
    if (SUCCEEDED(hres)) {
        hres = CoInitializeSecurity(NULL, -1, NULL, NULL, RPC_C_AUTHN_LEVEL_DEFAULT, 
                                    RPC_C_IMP_LEVEL_IMPERSONATE, NULL, EOAC_NONE, NULL);
        if (SUCCEEDED(hres) || hres == RPC_E_TOO_LATE) {
            IWbemLocator *pLoc = NULL;
            if (SUCCEEDED(CoCreateInstance(CLSID_WbemLocator, 0, CLSCTX_INPROC_SERVER,
                                           IID_IWbemLocator, (LPVOID *)&pLoc))) {
                IWbemServices *pSvc = NULL;
                if (SUCCEEDED(pLoc->ConnectServer(_bstr_t(L"ROOT\\CIMV2"),
                        NULL, NULL, 0, NULL, 0, 0, &pSvc))) {
                    IEnumWbemClassObject* pEnumerator = NULL;
                    HRESULT hr = pSvc->ExecQuery(
                        bstr_t("WQL"),
                        bstr_t("SELECT SerialNumber FROM Win32_PhysicalMedia"),
                        WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY,
                        NULL, &pEnumerator);
                    if (SUCCEEDED(hr)) {
                        IWbemClassObject *pObj = NULL;
                        ULONG uReturn = 0;
                        // 첫번째 Media의 Serial을 쓴다 (실제 시스템 드라이브 찾으려면 추가 작업 필요)
                        if (pEnumerator && pEnumerator->Next(WBEM_INFINITE, 1, &pObj, &uReturn) == S_OK) {
                            VARIANT vtSerial;
                            VariantInit(&vtSerial);
                            if (SUCCEEDED(pObj->Get(L"SerialNumber", 0, &vtSerial, 0, 0))) {
                                if (vtSerial.vt == VT_BSTR && vtSerial.bstrVal != NULL)
                                    serial = _bstr_t(vtSerial.bstrVal);
                                VariantClear(&vtSerial);
                            }
                            pObj->Release();
                        }
                        pEnumerator->Release();
                    }
                    pSvc->Release();
                }
                pLoc->Release();
            }
        }
        CoUninitialize();
    }

    // 2. WMI로 실패시, 볼륨 시리얼로 fallback
    if (serial.empty()) {
        DWORD volSerial = 0;
        if (GetVolumeInformationA("C:\\", NULL, 0, &volSerial, NULL, NULL, NULL, 0)) {
            char buf[32];
            sprintf(buf, "%08X", volSerial);
            serial = buf;
        }
    }

    // 모두 실패하면 빈값
    return serial;
}

// SHA256 해시 (Windows API)
std::string ToSHA256(const std::string& input) {
    HCRYPTPROV hProv = 0;
    HCRYPTHASH hHash = 0;
    BYTE hash[32];
    DWORD hashLen = 32;
    if (!CryptAcquireContext(&hProv, 0, 0, PROV_RSA_AES, CRYPT_VERIFYCONTEXT)) return "";
    if (!CryptCreateHash(hProv, CALG_SHA_256, 0, 0, &hHash)) {
        CryptReleaseContext(hProv, 0); return "";
    }
    CryptHashData(hHash, (BYTE*)input.data(), input.size(), 0);
    CryptGetHashParam(hHash, HP_HASHVAL, hash, &hashLen, 0);
    CryptDestroyHash(hHash);
    CryptReleaseContext(hProv, 0);

    // Hex 문자열로 변환
    char hex[65];
    for (int i = 0; i < 32; i++) sprintf(hex + i * 2, "%02X", hash[i]);
    hex[64] = 0;
    return hex;
}

// SHA256에서 숫자 6~8자리 라이선스 추출
std::string LicenseCodeFromHash(const std::string& hash, int digits = 6) {
    // 앞 12자리 16진수 → 10진수 변환 후 자릿수 제한
    unsigned long long n = std::stoull(hash.substr(0, 12), nullptr, 16);
    unsigned long long mod = 1;
    for (int i = 0; i < digits; ++i) mod *= 10;
    n = n % mod;
    unsigned long long minval = 1;
    for (int i = 1; i < digits; ++i) minval *= 10;
    if (n < minval) n += minval;
    char buf[16];
    sprintf(buf, "%0*llu", digits, n);
    return buf;
}

int main() {
    std::string machineGuid = GetMachineGuid();
    std::string mac = GetPrimaryMacAddress();
    std::string disk = GetSystemDiskSerial();

    std::cout << "MachineGuid: " << machineGuid << std::endl;
    std::cout << "MAC       : " << mac << std::endl;
    std::cout << "Disk SN   : " << disk << std::endl;

    std::string seed = machineGuid + mac + disk;
    std::string hash = ToSHA256(seed);

    std::string license6 = LicenseCodeFromHash(hash, 6);
    std::string license8 = LicenseCodeFromHash(hash, 8);

    std::cout << "라이선스 코드(6자리): " << license6 << std::endl;
    std::cout << "라이선스 코드(8자리): " << license8 << std::endl;

    return 0;
}
