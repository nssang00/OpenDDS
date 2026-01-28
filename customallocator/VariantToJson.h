#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <any>

typedef std::map<std::string, std::any> VariantDict;
typedef std::vector<std::any> VariantList;
typedef std::any Variant;

std::string VariantToJsonString(const Variant& v) {
    if (v.type() == typeid(int)) {
        return std::to_string(std::any_cast<int>(v));
    } else if (v.type() == typeid(long long)) {
        return std::to_string(std::any_cast<long long>(v));
    } else if (v.type() == typeid(double)) {
        return std::to_string(std::any_cast<double>(v));
    } else if (v.type() == typeid(float)) {
        return std::to_string(std::any_cast<float>(v));
    } else if (v.type() == typeid(bool)) {
        return std::any_cast<bool>(v) ? "true" : "false";
    } 
    else if (v.type() == typeid(std::string)) {
        return "\"" + std::any_cast<std::string>(v) + "\"";
    } 
    else if (v.type() == typeid(VariantList)) {
        const auto& list = std::any_cast<const VariantList&>(v);
        std::string res = "[";
        for (size_t i = 0; i < list.size(); ++i) {
            res += VariantToJsonString(list[i]);
            if (i + 1 < list.size()) 
                res += ",";
        }
        res += "]";
        return res;
    } 
    else if (v.type() == typeid(VariantDict)) {
        const auto& dict = std::any_cast<const VariantDict&>(v);
        std::string res = "{";
        size_t count = 0;
        for (const auto& [key, value] : dict) {
            res += "\"" + key + "\":" + VariantToJsonString(value);
            if (++count < dict.size()) 
                res += ",";
        }
        res += "}";
        return res;
    }

    return "null";
}
