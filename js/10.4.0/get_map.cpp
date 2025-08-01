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

// 가상 어댑터 여부 검사
bool IsVirtualAdapter(const char* desc) {
    if (!desc) return false;
    return strstr(desc, "Virtual") || strstr(desc, "VMware") || strstr(desc, "Hyper-V") ||
           strstr(desc, "Loopback") || strstr(desc, "TAP");
}

// 대표 MAC 주소 (Metric 최소)
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
std::string GetSystemDiskSerial() {
    HRESULT hres = CoInitializeEx(0, COINIT_MULTITHREADED);
    if (FAILED(hres)) return "";

    hres = CoInitializeSecurity(
        NULL, -1, NULL, NULL,
        RPC_C_AUTHN_LEVEL_DEFAULT, RPC_C_IMP_LEVEL_IMPERSONATE,
        NULL, EOAC_NONE, NULL);
    if (FAILED(hres) && hres != RPC_E_TOO_LATE) {
        CoUninitialize();
        return "";
    }

    IWbemLocator *pLoc = NULL;
    hres = CoCreateInstance(CLSID_WbemLocator, 0, CLSCTX_INPROC_SERVER,
                            IID_IWbemLocator, (LPVOID *)&pLoc);
    if (FAILED(hres)) {
        CoUninitialize();
        return "";
    }

    IWbemServices *pSvc = NULL;
    hres = pLoc->ConnectServer(
        _bstr_t(L"ROOT\\CIMV2"),
        NULL, NULL, 0, NULL, 0, 0, &pSvc);
    if (FAILED(hres)) {
        pLoc->Release();
        CoUninitialize();
        return "";
    }

    // Win32_LogicalDiskToPartition 매핑: C: => Disk#
    IEnumWbemClassObject* pEnumerator = NULL;
    hres = pSvc->ExecQuery(
        bstr_t("WQL"),
        bstr_t("SELECT * FROM Win32_LogicalDiskToPartition"),
        WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY,
        NULL, &pEnumerator);
    std::string diskNum;
    if (SUCCEEDED(hres)) {
        IWbemClassObject *pObj = NULL;
        ULONG uReturn = 0;
        while (pEnumerator && pEnumerator->Next(WBEM_INFINITE, 1, &pObj, &uReturn) == S_OK) {
            VARIANT ante, dep;
            pObj->Get(L"Antecedent", 0, &ante, 0, 0);
            pObj->Get(L"Dependent", 0, &dep, 0, 0);
            std::wstring depStr(dep.bstrVal, SysStringLen(dep.bstrVal));
            std::wstring anteStr(ante.bstrVal, SysStringLen(ante.bstrVal));
            // C: 드라이브를 찾음
            if (depStr.find(L"DeviceID=\"C:\"") != std::wstring::npos) {
                // Antecedent: "Win32_DiskPartition.DeviceID=\"Disk #0, Partition #0\""
                size_t start = anteStr.find(L"Disk #");
                if (start != std::wstring::npos) {
                    size_t end = anteStr.find(L",", start);
                    if (end != std::wstring::npos) {
                        diskNum = std::to_string(_wtoi(anteStr.substr(start + 6, end - (start + 6)).c_str()));
                        break;
                    }
                }
            }
            VariantClear(&ante);
            VariantClear(&dep);
            pObj->Release();
        }
        if (pEnumerator) pEnumerator->Release();
    }

    std::string serial;
    // Win32_DiskDrive에서 Disk # 일치하는 SerialNumber 추출
    if (!diskNum.empty()) {
        std::string query = "SELECT * FROM Win32_DiskDrive";
        IEnumWbemClassObject* pEnum2 = NULL;
        hres = pSvc->ExecQuery(
            bstr_t("WQL"),
            bstr_t(query.c_str()),
            WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY,
            NULL, &pEnum2);
        if (SUCCEEDED(hres)) {
            IWbemClassObject *pObj = NULL;
            ULONG uReturn = 0;
            int idx = 0;
            while (pEnum2 && pEnum2->Next(WBEM_INFINITE, 1, &pObj, &uReturn) == S_OK) {
                VARIANT dev, ser;
                pObj->Get(L"Index", 0, &dev, 0, 0);
                pObj->Get(L"SerialNumber", 0, &ser, 0, 0);
                if (dev.vt == VT_I4 && std::to_string(dev.intVal) == diskNum && ser.vt == VT_BSTR) {
                    _bstr_t bstrSer(ser.bstrVal);
                    serial = (const char*)bstrSer;
                    VariantClear(&dev); VariantClear(&ser);
                    pObj->Release();
                    break;
                }
                VariantClear(&dev); VariantClear(&ser);
                pObj->Release();
                idx++;
            }
            if (pEnum2) pEnum2->Release();
        }
    }
    pSvc->Release();
    pLoc->Release();
    CoUninitialize();
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

int main() {
    std::string machineGuid = GetMachineGuid();
    std::string mac = GetPrimaryMacAddress();
    std::string disk = GetSystemDiskSerial();

    std::cout << "MachineGuid: " << machineGuid << std::endl;
    std::cout << "MAC       : " << mac << std::endl;
    std::cout << "Disk SN   : " << disk << std::endl;

    std::string seed = machineGuid + mac + disk;
    std::string hash = ToSHA256(seed);
    std::string license = hash.substr(0, 6);

    std::cout << "라이선스 코드(6자리): " << license << std::endl;

    return 0;
}
