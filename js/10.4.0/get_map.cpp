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

#include <windows.h>
#include <winioctl.h>
#include <string>
#include <stdexcept>
#include <vector>

// 디스크 시리얼 번호를 문자열로 반환하는 함수 (예: PhysicalDrive0)
std::string GetDiskSerialNumber(int diskNumber = 0) {
    std::wstring devicePath = L"\\\\.\\PhysicalDrive" + std::to_wstring(diskNumber);

    // 디스크 핸들 열기
    HANDLE hDevice = CreateFileW(
        devicePath.c_str(),
        0, // GENERIC_READ/WRITE 없어도 동작함
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        NULL,
        OPEN_EXISTING,
        0,
        NULL
    );

    if (hDevice == INVALID_HANDLE_VALUE) {
        throw std::runtime_error("CreateFile failed. Error code: " + std::to_string(GetLastError()));
    }

    // STORAGE_PROPERTY_QUERY 설정
    STORAGE_PROPERTY_QUERY query = {};
    query.PropertyId = StorageDeviceProperty;
    query.QueryType = PropertyStandardQuery;

    // 버퍼 준비
    std::vector<BYTE> buffer(1024);
    DWORD bytesReturned = 0;

    BOOL result = DeviceIoControl(
        hDevice,
        IOCTL_STORAGE_QUERY_PROPERTY,
        &query,
        sizeof(query),
        buffer.data(),
        (DWORD)buffer.size(),
        &bytesReturned,
        NULL
    );

    CloseHandle(hDevice);

    if (!result) {
        throw std::runtime_error("DeviceIoControl failed. Error code: " + std::to_string(GetLastError()));
    }

    auto descriptor = reinterpret_cast<STORAGE_DEVICE_DESCRIPTOR*>(buffer.data());
    if (descriptor->SerialNumberOffset != 0 &&
        descriptor->SerialNumberOffset < buffer.size()) {
        
        const char* serial = reinterpret_cast<const char*>(buffer.data() + descriptor->SerialNumberOffset);

        std::string cleaned;
        for (char c : std::string(serial)) {
            if (isprint(static_cast<unsigned char>(c)) && c != ' ' && c != '\n' && c != '\r') {
                cleaned += c;
            }
        }

        return cleaned;
    }

    return "";
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

// LicenseCodeFromHash: SHA256 해시에서 앞 12자리 → 6자리 숫자
std::string LicenseCodeFromHash(const std::string& hash, int digits = 6) {
    // 1. 유효성 검사
    if (hash.empty() || hash.length() < 16) 
        throw std::invalid_argument("Hash string too short");
    if (digits <= 0 || digits > 19) 
        throw std::invalid_argument("Digits must be 1-19");

    unsigned long long n;
    try {
        n = std::stoull(hash.substr(0, 16), nullptr, 16); // 64비트
    } catch (...) {
        throw std::runtime_error("Hex conversion failed");
    }

    unsigned long long mod = std::pow(10, digits);
    n %= mod;

    char buf[32];
    snprintf(buf, sizeof(buf), "%0*llu", digits, n);
    return std::string(buf);
}

// FNV-1a (32bit) 해시로 6자리 숫자 추출
uint32_t Fnv1a(const std::string& data) {
    uint32_t hash = 2166136261U;
    for (size_t i = 0; i < data.size(); ++i) {
        hash ^= (uint8_t)data[i];
        hash *= 16777619U;
    }
    return hash;
}
std::string LicenseCodeFromFnv1a(const std::string& hash, int digits = 6) {
    uint32_t h = Fnv1a(hash);
    uint32_t mod = 1;
    for (int i = 0; i < digits; ++i) mod *= 10;
    uint32_t n = h % mod;
    uint32_t minval = 1;
    for (int i = 1; i < digits; ++i) minval *= 10;
    if (n < minval) n += minval;
    char buf[16];
    sprintf(buf, "%0*u", digits, n);
    return buf;
}

// CRC32 (단순 구현)
uint32_t crc32(const std::string& s) {
    uint32_t crc = 0xFFFFFFFF;
    for (auto c : s) {
        crc ^= (uint8_t)c;
        for (int k = 0; k < 8; ++k)
            crc = (crc >> 1) ^ (0xEDB88320 & -(crc & 1));
    }
    return ~crc;
}
std::string LicenseCodeFromCRC32(const std::string& hash, int digits = 6) {
    uint32_t h = crc32(hash);
    uint32_t mod = 1;
    for (int i = 0; i < digits; ++i) mod *= 10;
    uint32_t n = h % mod;
    uint32_t minval = 1;
    for (int i = 1; i < digits; ++i) minval *= 10;
    if (n < minval) n += minval;
    char buf[16];
    sprintf(buf, "%0*u", digits, n);
    return buf;
}

int main() {
    std::string sha256hash = "2AF13D4D2FC8E5A118BDE44C23B3CF4A1F8C42D0B21E9E3E7D1385CFED6A3C1C";
    std::cout << "LicenseCodeFromHash : " << LicenseCodeFromHash(sha256hash, 6) << std::endl;
    std::cout << "LicenseCodeFromFnv1a: " << LicenseCodeFromFnv1a(sha256hash, 6) << std::endl;
    std::cout << "LicenseCodeFromCRC32: " << LicenseCodeFromCRC32(sha256hash, 6) << std::endl;
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

    std::cout << "LicenseCodeFromHash : " << LicenseCodeFromHash(sha256hash, 6) << std::endl;
    std::cout << "LicenseCodeFromFnv1a: " << LicenseCodeFromFnv1a(sha256hash, 6) << std::endl;
    std::cout << "LicenseCodeFromCRC32: " << LicenseCodeFromCRC32(sha256hash, 6) << std::endl;    

    return 0;
}
