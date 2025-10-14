// find_apphost_entry_dll.cpp
// MSVC: cl /EHsc find_apphost_entry_dll.cpp
// g++(MinGW): g++ -municode -std=c++17 find_apphost_entry_dll.cpp -o find_apphost_entry_dll.exe

#include <windows.h>
#include <string>
#include <vector>
#include <fstream>
#include <iostream>
#include <algorithm>
#include <cctype>

static inline bool is_printable_ascii(char c) {
    unsigned char uc = static_cast<unsigned char>(c);
    return uc >= 0x20 && uc <= 0x7E;
}

// Normalize path candidate (trim spaces)
static std::string trim(const std::string& s) {
    size_t a = 0, b = s.size();
    while (a < b && (s[a] == ' ' || s[a] == '\t')) ++a;
    while (b > a && (s[b-1] == ' ' || s[b-1] == '\t')) --b;
    return s.substr(a, b - a);
}

// Given buffer and index of '.' of ".dll", extract ASCII filename (search back up to maxLen chars)
static std::string extract_ascii_name(const std::vector<unsigned char>& buf, size_t dotPos, size_t maxBack = 260) {
    if (dotPos + 4 > buf.size()) return {};
    // sanity check ".dll"
    if (tolower(buf[dotPos]) != '.' || tolower(buf[dotPos+1]) != 'd' || tolower(buf[dotPos+2]) != 'l' || tolower(buf[dotPos+3]) != 'l')
        return {};

    size_t start = (dotPos > maxBack) ? dotPos - maxBack : 0;
    size_t p = dotPos;
    // move back until null or non-printable or slash
    while (p > start) {
        unsigned char c = buf[p - 1];
        if (c == 0) break;
        if (!is_printable_ascii(static_cast<char>(c))) break;
        if (c == '\\' || c == '/') { // treat path separator as boundary (we'll keep filename after it)
            // move forward to after slash
            size_t nameStart = p;
            size_t nameEnd = dotPos + 4;
            if (nameEnd > buf.size()) nameEnd = buf.size();
            return std::string(reinterpret_cast<const char*>(&buf[nameStart]), nameEnd - nameStart);
        }
        --p;
    }
    // if no slash found, take from p..dotPos+4
    size_t nameEnd = dotPos + 4;
    if (nameEnd > buf.size()) nameEnd = buf.size();
    if (p >= nameEnd) return {};
    return std::string(reinterpret_cast<const char*>(&buf[p]), nameEnd - p);
}

// Extract UTF-16LE string ending at dotPos (dotPos points to '.' byte in UTF-16LE sequence)
static std::string extract_utf16le_name(const std::vector<unsigned char>& buf, size_t dotPos, size_t maxChars = 260) {
    // need at least 8 bytes: ".\0d\0l\0l\0"
    if (dotPos + 8 > buf.size()) return {};
    if (buf[dotPos] != '.' || buf[dotPos+1] != 0x00) return {};
    if (tolower(buf[dotPos+2]) != 'd' || buf[dotPos+3] != 0x00) return {};
    if (tolower(buf[dotPos+4]) != 'l' || buf[dotPos+5] != 0x00) return {};
    if (tolower(buf[dotPos+6]) != 'l' || buf[dotPos+7] != 0x00) return {};

    // walk back in 2-byte steps
    size_t maxBytesBack = std::min<size_t>(dotPos, maxChars * 2);
    size_t p = dotPos;
    while (p >= 2 && p > dotPos - maxBytesBack) {
        // check for UTF-16 null (0x00 0x00)
        if (buf[p-2] == 0x00 && buf[p-1] == 0x00) {
            p -= 2;
            break;
        }
        // check printable ascii in low byte and high byte == 0
        if (buf[p-1] != 0x00) break;
        unsigned char ch = buf[p-2];
        if (!is_printable_ascii(static_cast<char>(ch))) break;
        p -= 2;
    }
    // build narrow string from UTF-16LE sequence from p..dotPos+8
    std::string out;
    for (size_t i = p; i + 1 < buf.size() && i < dotPos + 8; i += 2) {
        if (buf[i] == 0x00 && buf[i+1] == 0x00) break;
        unsigned char low = buf[i];
        unsigned char high = buf[i+1];
        if (high != 0x00) break; // non-ascii character -> stop
        out.push_back(static_cast<char>(low));
    }
    // if contains backslash, return substring after last slash
    size_t slash = out.find_last_of("\\/");
    if (slash != std::string::npos) return out.substr(slash + 1);
    return out;
}

// Check if candidate refers to an absolute path or relative; resolve relative against baseDir
static std::wstring resolve_candidate_path(const std::wstring& baseDirW, const std::string& candidateA) {
    if (candidateA.empty()) return {};
    // convert ascii candidate to wide
    int len = MultiByteToWideChar(CP_UTF8, 0, candidateA.c_str(), -1, NULL, 0);
    if (len == 0) return {};
    std::wstring candW(len, L'\0');
    MultiByteToWideChar(CP_UTF8, 0, candidateA.c_str(), -1, &candW[0], len);
    // remove trailing null added by MultiByteToWideChar
    if (!candW.empty() && candW.back() == L'\0') candW.pop_back();

    // if absolute path or starts with drive or UNC
    if (PathIsRelativeW(candW.c_str()) == FALSE) {
        return candW;
    }
    // else join with baseDir
    std::wstring out = baseDirW;
    if (!out.empty() && out.back() != L'\\' && out.back() != L'/') out.push_back(L'\\');
    out += candW;
    return out;
}

// Main function: given apphost.exe path, return full path to DLL if found and exists; else empty
std::wstring FindEntryDllFromAppHostFile(const std::wstring& apphostPathW) {
    // read file
    std::string apphostPathA;
    int req = WideCharToMultiByte(CP_UTF8, 0, apphostPathW.c_str(), -1, NULL, 0, NULL, NULL);
    if (req == 0) return {};
    apphostPathA.resize(req);
    WideCharToMultiByte(CP_UTF8, 0, apphostPathW.c_str(), -1, &apphostPathA[0], req, NULL, NULL);

    std::ifstream f(apphostPathA, std::ios::binary);
    if (!f) return {};
    f.seekg(0, std::ios::end);
    std::streamoff sz = f.tellg();
    if (sz <= 0 || sz > 50 * 1024 * 1024) return {}; // guard: limit 50MB
    f.seekg(0, std::ios::beg);
    std::vector<unsigned char> buf((size_t)sz);
    f.read(reinterpret_cast<char*>(buf.data()), sz);

    // base directory of apphost
    wchar_t dirBuf[MAX_PATH];
    wcscpy_s(dirBuf, apphostPathW.c_str());
    PathRemoveFileSpecW(dirBuf);
    std::wstring baseDir(dirBuf);

    // search ASCII ".dll"
    for (size_t i = 0; i + 4 <= buf.size(); ++i) {
        if (buf[i] == '.' && (i + 3) < buf.size()) {
            if (tolower(buf[i+1]) == 'd' && tolower(buf[i+2]) == 'l' && tolower(buf[i+3]) == 'l') {
                std::string cand = extract_ascii_name(buf, i);
                cand = trim(cand);
                if (cand.empty()) continue;
                // ignore known placeholder
                if (_stricmp(cand.c_str(), "ThisProgramDoesNotExist.dll") == 0) continue;
                // resolve and check existence
                std::wstring full = resolve_candidate_path(baseDir, cand);
                if (!full.empty()) {
                    if (GetFileAttributesW(full.c_str()) != INVALID_FILE_ATTRIBUTES) return full;
                }
            }
        }
    }

    // search UTF-16LE ".dll"
    for (size_t i = 0; i + 8 <= buf.size(); ++i) {
        if (buf[i] == '.' && buf[i+1] == 0x00 &&
            (tolower(buf[i+2]) == 'd') && buf[i+3] == 0x00 &&
            (tolower(buf[i+4]) == 'l') && buf[i+5] == 0x00 &&
            (tolower(buf[i+6]) == 'l') && buf[i+7] == 0x00) {

            std::string cand = extract_utf16le_name(buf, i);
            cand = trim(cand);
            if (cand.empty()) continue;
            if (_stricmp(cand.c_str(), "ThisProgramDoesNotExist.dll") == 0) continue;
            std::wstring full = resolve_candidate_path(baseDir, cand);
            if (!full.empty()) {
                if (GetFileAttributesW(full.c_str()) != INVALID_FILE_ATTRIBUTES) return full;
            }
        }
    }

    // not found
    return {};
}

// 간단한 테스트 실행
int wmain(int argc, wchar_t** argv) {
    std::wstring path;
    if (argc >= 2) path = argv[1];
    else {
        wchar_t exePath[MAX_PATH];
        GetModuleFileNameW(NULL, exePath, MAX_PATH);
        path = exePath; // default: use current exe
    }

    std::wstring dllPath = FindEntryDllFromAppHostFile(path);
    if (dllPath.empty()) {
        std::wcout << L"Entry DLL not found for: " << path << L"\n";
    } else {
        std::wcout << L"Found entry DLL: " << dllPath << L"\n";
    }
    return 0;
}
