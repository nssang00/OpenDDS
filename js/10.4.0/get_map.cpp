#include <windows.h>
#include <wbemidl.h>
#include <comdef.h>
#include <iphlpapi.h>
#include <intrin.h>
#include <iostream>
#include <string>
#include <sstream>
#include <iomanip>
#include <fstream>
#include <vector>

#pragma comment(lib, "wbemuuid.lib")
#pragma comment(lib, "iphlpapi.lib")

class HardwareLicenseSystem {
private:
    std::string macAddress;
    std::string cpuId;
    std::string biosSerial;
    std::string hardwareHash;
    std::string licenseCode;

public:
    // MAC 주소 가져오기
    bool GetMacAddress() {
        IP_ADAPTER_INFO adapterInfo[16];
        DWORD bufLen = sizeof(adapterInfo);
        
        DWORD status = GetAdaptersInfo(adapterInfo, &bufLen);
        if (status != ERROR_SUCCESS) {
            return false;
        }
        
        PIP_ADAPTER_INFO adapter = adapterInfo;
        while (adapter) {
            if (adapter->Type == MIB_IF_TYPE_ETHERNET) {
                std::stringstream ss;
                for (int i = 0; i < adapter->AddressLength; i++) {
                    if (i > 0) ss << ":";
                    ss << std::hex << std::setw(2) << std::setfill('0') 
                       << (int)adapter->Address[i];
                }
                macAddress = ss.str();
                return true;
            }
            adapter = adapter->Next;
        }
        return false;
    }

    // CPU ID 가져오기
    bool GetCpuId() {
        int cpuInfo[4] = {0};
        __cpuid(cpuInfo, 0);
        
        std::stringstream ss;
        ss << std::hex << cpuInfo[1] << cpuInfo[3] << cpuInfo[2]; // EBX, EDX, ECX
        cpuId = ss.str();
        return true;
    }

    // BIOS Serial Number 가져오기
    bool GetBiosSerial() {
        HRESULT hres;
        
        // COM 초기화
        hres = CoInitializeEx(0, COINIT_MULTITHREADED);
        if (FAILED(hres)) return false;

        // WMI 보안 초기화
        hres = CoInitializeSecurity(NULL, -1, NULL, NULL, 
                                   RPC_C_AUTHN_LEVEL_DEFAULT,
                                   RPC_C_IMP_LEVEL_IMPERSONATE,
                                   NULL, EOAC_NONE, NULL);

        IWbemLocator *pLoc = NULL;
        hres = CoCreateInstance(CLSID_WbemLocator, 0, CLSCTX_INPROC_SERVER,
                               IID_IWbemLocator, (LPVOID *)&pLoc);
        if (FAILED(hres)) {
            CoUninitialize();
            return false;
        }

        IWbemServices *pSvc = NULL;
        hres = pLoc->ConnectServer(_bstr_t(L"ROOT\\CIMV2"), NULL, NULL, 0,
                                  NULL, 0, 0, &pSvc);
        if (FAILED(hres)) {
            pLoc->Release();
            CoUninitialize();
            return false;
        }

        hres = CoSetProxyBlanket(pSvc, RPC_C_AUTHN_WINNT, RPC_C_AUTHZ_NONE,
                                NULL, RPC_C_AUTHN_LEVEL_CALL,
                                RPC_C_IMP_LEVEL_IMPERSONATE, NULL, EOAC_NONE);

        IEnumWbemClassObject* pEnumerator = NULL;
        hres = pSvc->ExecQuery(bstr_t("WQL"),
                              bstr_t("SELECT SerialNumber FROM Win32_BIOS"),
                              WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY,
                              NULL, &pEnumerator);

        if (FAILED(hres)) {
            pSvc->Release();
            pLoc->Release();
            CoUninitialize();
            return false;
        }

        IWbemClassObject *pclsObj = NULL;
        ULONG uReturn = 0;
        bool found = false;

        while (pEnumerator) {
            HRESULT hr = pEnumerator->Next(WBEM_INFINITE, 1, &pclsObj, &uReturn);
            if (0 == uReturn) break;

            VARIANT vtProp;
            hr = pclsObj->Get(L"SerialNumber", 0, &vtProp, 0, 0);
            if (SUCCEEDED(hr) && vtProp.vt == VT_BSTR) {
                _bstr_t serial(vtProp.bstrVal);
                biosSerial = (char*)serial;
                found = true;
            }
            VariantClear(&vtProp);
            pclsObj->Release();
            break;
        }

        pSvc->Release();
        pLoc->Release();
        pEnumerator->Release();
        CoUninitialize();
        return found;
    }

    // 하드웨어 정보를 해시화하여 6자리 숫자 코드 생성
    std::string GenerateLicenseCode() {
        if (!GetMacAddress() || !GetCpuId() || !GetBiosSerial()) {
            return "";
        }

        // 하드웨어 정보 결합
        hardwareHash = macAddress + cpuId + biosSerial;
        
        // 간단한 해시 함수로 6자리 숫자 생성
        unsigned int hash = 0;
        for (char c : hardwareHash) {
            hash = hash * 31 + (unsigned char)c;
        }
        
        // 6자리 숫자로 변환 (100000 ~ 999999)
        int code = (hash % 900000) + 100000;
        licenseCode = std::to_string(code);
        
        return licenseCode;
    }

    // 라이센스 파일 생성
    bool CreateLicenseFile(const std::string& filename) {
        if (licenseCode.empty()) {
            if (GenerateLicenseCode().empty()) {
                return false;
            }
        }

        std::ofstream file(filename);
        if (!file.is_open()) {
            return false;
        }

        file << "[LICENSE]\n";
        file << "CODE=" << licenseCode << "\n";
        file << "MAC=" << macAddress << "\n";
        file << "CPU=" << cpuId << "\n";
        file << "BIOS=" << biosSerial << "\n";
        file << "GENERATED=" << GetCurrentTimestamp() << "\n";
        
        file.close();
        return true;
    }

    // 라이센스 파일 검증
    bool ValidateLicenseFile(const std::string& filename) {
        std::ifstream file(filename);
        if (!file.is_open()) {
            return false;
        }

        std::string line, storedCode;
        while (std::getline(file, line)) {
            if (line.find("CODE=") == 0) {
                storedCode = line.substr(5);
                break;
            }
        }
        file.close();

        if (storedCode.empty()) {
            return false;
        }

        // 현재 하드웨어로 코드 재생성하여 비교
        std::string currentCode = GenerateLicenseCode();
        return (currentCode == storedCode);
    }

    // 현재 시간 문자열 반환
    std::string GetCurrentTimestamp() {
        SYSTEMTIME st;
        GetLocalTime(&st);
        
        std::stringstream ss;
        ss << st.wYear << "-" 
           << std::setw(2) << std::setfill('0') << st.wMonth << "-"
           << std::setw(2) << std::setfill('0') << st.wDay << " "
           << std::setw(2) << std::setfill('0') << st.wHour << ":"
           << std::setw(2) << std::setfill('0') << st.wMinute << ":"
           << std::setw(2) << std::setfill('0') << st.wSecond;
        
        return ss.str();
    }

    // 정보 출력
    void PrintHardwareInfo() {
        std::cout << "=== Hardware Information ===" << std::endl;
        std::cout << "MAC Address: " << macAddress << std::endl;
        std::cout << "CPU ID: " << cpuId << std::endl;
        std::cout << "BIOS Serial: " << biosSerial << std::endl;
        std::cout << "License Code: " << licenseCode << std::endl;
        std::cout << "===========================" << std::endl;
    }
};

// 사용 예시
int main() {
    HardwareLicenseSystem license;
    
    std::cout << "Hardware License System" << std::endl;
    std::cout << "======================" << std::endl;
    
    // 라이센스 코드 생성
    std::string code = license.GenerateLicenseCode();
    if (code.empty()) {
        std::cout << "Failed to generate license code!" << std::endl;
        return 1;
    }
    
    // 하드웨어 정보 출력
    license.PrintHardwareInfo();
    
    // 라이센스 파일 생성
    if (license.CreateLicenseFile("license.dat")) {
        std::cout << "\nLicense file created successfully!" << std::endl;
    } else {
        std::cout << "\nFailed to create license file!" << std::endl;
        return 1;
    }
    
    // 라이센스 파일 검증
    if (license.ValidateLicenseFile("license.dat")) {
        std::cout << "License validation: PASSED" << std::endl;
    } else {
        std::cout << "License validation: FAILED" << std::endl;
    }
    
    return 0;
}


/////////////////////////

// 간단한 라이센스 검증 함수 (실제 프로그램에서 사용)
#include <windows.h>
#include <wbemidl.h>
#include <comdef.h>
#include <iphlpapi.h>
#include <intrin.h>
#include <iostream>
#include <string>
#include <sstream>
#include <fstream>

#pragma comment(lib, "wbemuuid.lib")
#pragma comment(lib, "iphlpapi.lib")

class SimpleLicenseCheck {
public:
    // 현재 컴퓨터의 6자리 라이센스 코드 생성
    static std::string GetHardwareLicenseCode() {
        std::string mac = GetMacAddress();
        std::string cpu = GetCpuId();
        std::string bios = GetBiosSerial();
        
        if (mac.empty() || cpu.empty() || bios.empty()) {
            return "";
        }
        
        // 하드웨어 정보 결합 후 해시
        std::string combined = mac + cpu + bios;
        unsigned int hash = 0;
        
        for (char c : combined) {
            hash = hash * 31 + (unsigned char)c;
        }
        
        int code = (hash % 900000) + 100000;
        return std::to_string(code);
    }
    
    // 라이센스 파일에서 코드 읽기
    static std::string ReadLicenseCode(const std::string& filename) {
        std::ifstream file(filename);
        if (!file.is_open()) return "";
        
        std::string line;
        while (std::getline(file, line)) {
            if (line.find("CODE=") == 0) {
                return line.substr(5);
            }
        }
        return "";
    }
    
    // 라이센스 검증 (true = 유효, false = 무효)
    static bool IsLicenseValid(const std::string& licenseFile = "license.dat") {
        std::string currentCode = GetHardwareLicenseCode();
        std::string storedCode = ReadLicenseCode(licenseFile);
        
        return (!currentCode.empty() && !storedCode.empty() && 
                currentCode == storedCode);
    }

private:
    static std::string GetMacAddress() {
        IP_ADAPTER_INFO adapterInfo[16];
        DWORD bufLen = sizeof(adapterInfo);
        
        if (GetAdaptersInfo(adapterInfo, &bufLen) != ERROR_SUCCESS) {
            return "";
        }
        
        PIP_ADAPTER_INFO adapter = adapterInfo;
        while (adapter) {
            if (adapter->Type == MIB_IF_TYPE_ETHERNET) {
                std::stringstream ss;
                for (int i = 0; i < adapter->AddressLength; i++) {
                    ss << std::hex << (int)adapter->Address[i];
                }
                return ss.str();
            }
            adapter = adapter->Next;
        }
        return "";
    }
    
    static std::string GetCpuId() {
        int cpuInfo[4] = {0};
        __cpuid(cpuInfo, 0);
        
        std::stringstream ss;
        ss << std::hex << cpuInfo[1] << cpuInfo[3] << cpuInfo[2];
        return ss.str();
    }
    
    static std::string GetBiosSerial() {
        // WMI를 사용한 BIOS 시리얼 번호 획득 (간소화된 버전)
        CoInitializeEx(0, COINIT_MULTITHREADED);
        
        IWbemLocator *pLoc = NULL;
        CoCreateInstance(CLSID_WbemLocator, 0, CLSCTX_INPROC_SERVER,
                        IID_IWbemLocator, (LPVOID *)&pLoc);
        
        IWbemServices *pSvc = NULL;
        pLoc->ConnectServer(_bstr_t(L"ROOT\\CIMV2"), NULL, NULL, 0,
                           NULL, 0, 0, &pSvc);
        
        IEnumWbemClassObject* pEnumerator = NULL;
        pSvc->ExecQuery(bstr_t("WQL"),
                       bstr_t("SELECT SerialNumber FROM Win32_BIOS"),
                       WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY,
                       NULL, &pEnumerator);
        
        IWbemClassObject *pclsObj = NULL;
        ULONG uReturn = 0;
        std::string serial = "";
        
        if (pEnumerator->Next(WBEM_INFINITE, 1, &pclsObj, &uReturn) == S_OK) {
            VARIANT vtProp;
            if (pclsObj->Get(L"SerialNumber", 0, &vtProp, 0, 0) == S_OK) {
                _bstr_t bstrSerial(vtProp.bstrVal);
                serial = (char*)bstrSerial;
            }
            VariantClear(&vtProp);
            pclsObj->Release();
        }
        
        pEnumerator->Release();
        pSvc->Release();
        pLoc->Release();
        CoUninitialize();
        
        return serial;
    }
};

// 실제 프로그램에서 사용하는 방법
int main() {
    // 프로그램 시작 시 라이센스 검증
    if (!SimpleLicenseCheck::IsLicenseValid()) {
        std::cout << "Invalid license! This software is not authorized for this computer." << std::endl;
        std::cout << "Hardware Code: " << SimpleLicenseCheck::GetHardwareLicenseCode() << std::endl;
        return 1;  // 프로그램 종료
    }
    
    std::cout << "License valid! Starting application..." << std::endl;
    
    // 여기에 실제 프로그램 로직
    // ...
    
    return 0;
}
