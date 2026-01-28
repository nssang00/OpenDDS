#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <any>
#include <sstream>
#include <iomanip>

typedef std::map<std::string, std::any> VariantDict;
typedef std::vector<std::any> VariantList;
typedef std::any Variant;

// 문자열 내 특수문자 이스케이프 처리 (JSON 규격 준수)
std::string EscapeJsonString(const std::string& s) {
    std::ostringstream oss;
    oss << '"';
    for (char c : s) {
        switch (c) {
            case '"':  oss << "\\\""; break;
            case '\\': oss << "\\\\"; break;
            case '\b': oss << "\\b";  break;
            case '\f': oss << "\\f";  break;
            case '\n': oss << "\\n";  break;
            case '\r': oss << "\\r";  break;
            case '\t': oss << "\\t";  break;
            default:   oss << c;      break;
        }
    }
    oss << '"';
    return oss.str();
}

std::string VariantToJsonString(const Variant& v) {
    // 숫자형
    if (v.type() == typeid(int)) return std::to_string(std::any_cast<int>(v));
    if (v.type() == typeid(long long)) return std::to_string(std::any_cast<long long>(v));
    if (v.type() == typeid(double)) return std::to_string(std::any_cast<double>(v));
    if (v.type() == typeid(float)) return std::to_string(std::any_cast<float>(v));
    if (v.type() == typeid(bool)) return std::any_cast<bool>(v) ? "true" : "false";
    
    // 문자열
    if (v.type() == typeid(std::string)) {
        return EscapeJsonString(std::any_cast<std::string>(v));
    }
    if (v.type() == typeid(const char*)) {
        return EscapeJsonString(std::any_cast<const char*>(v));
    }

    // List
    if (v.type() == typeid(VariantList)) {
        const auto& list = std::any_cast<const VariantList&>(v);
        std::string res = "[";
        for (size_t i = 0; i < list.size(); ++i) {
            res += VariantToJsonString(list[i]);
            if (i + 1 < list.size()) res += ",";  // 약간 더 명확
        }
        res += "]";
        return res;
    }

    // Dict
    if (v.type() == typeid(VariantDict)) {
        const auto& dict = std::any_cast<const VariantDict&>(v);
        std::string res = "{";
        size_t count = 0;
        for (const auto& [key, value] : dict) {  // structured binding 사용
            res += EscapeJsonString(key) + ":" + VariantToJsonString(value);
            if (++count < dict.size()) res += ",";
        }
        res += "}";
        return res;
    }

    return "null";
}
