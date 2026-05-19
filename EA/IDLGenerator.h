// ── IDLGenerator.h : 모델 → IDL 변환 ──────────────────

#include "EARepository.h"
#include <sstream>
#include <fstream>

class IDLGenerator {
public:
    explicit IDLGenerator(const EARepository& repo) : repo_(repo) {}

    void generate(const std::string& outPath) {
        oss_.str("");
        oss_ << "// Auto-generated IDL\n\n";

        // 패키지 → module 로 감싸기
        for (auto& [pkgId, pkg] : repo_.allPackages()) {
            if (pkg.parentId != 0) continue;  // 최상위만
            writeModule(pkg, 0);
        }

        std::ofstream f(outPath);
        f << oss_.str();
    }

private:
    const EARepository& repo_;
    std::ostringstream  oss_;

    void writeModule(const EAPackage& pkg, int depth) {
        indent(depth); oss_ << "module " << pkg.name << " {\n\n";

        for (auto* obj : repo_.objectsInPackage(pkg.id))
            writeObject(*obj, depth + 1);

        indent(depth); oss_ << "}; // module " << pkg.name << "\n\n";
    }

    void writeObject(const EAObject& obj, int depth) {
        if      (obj.objType == "Interface")   writeInterface(obj, depth);
        else if (obj.objType == "Class")       writeStruct(obj, depth);
        else if (obj.objType == "Enumeration") writeEnum(obj, depth);
    }

    void writeInterface(const EAObject& obj, int depth) {
        // 상속 관계 찾기
        std::string base;
        for (auto& c : repo_.connectorsOf(obj.id))
            if (c.connType == "Generalization" && c.startObjId == obj.id)
                if (auto* parent = repo_.findObject(c.endObjId))
                    base = " : " + parent->name;

        indent(depth); oss_ << "interface " << obj.name << base << " {\n";
        for (auto& op : obj.operations)  writeOperation(op, depth + 1);
        indent(depth); oss_ << "};\n\n";
    }

    void writeStruct(const EAObject& obj, int depth) {
        indent(depth); oss_ << "struct " << obj.name << " {\n";
        for (auto& attr : obj.attributes) {
            indent(depth + 1);
            oss_ << mapType(attr.type) << " " << attr.name << ";\n";
        }
        indent(depth); oss_ << "};\n\n";
    }

    void writeEnum(const EAObject& obj, int depth) {
        indent(depth); oss_ << "enum " << obj.name << " {\n";
        for (size_t i = 0; i < obj.attributes.size(); ++i) {
            indent(depth + 1);
            oss_ << obj.attributes[i].name;
            if (i + 1 < obj.attributes.size()) oss_ << ",";
            oss_ << "\n";
        }
        indent(depth); oss_ << "};\n\n";
    }

    void writeOperation(const EAOperation& op, int depth) {
        indent(depth);
        oss_ << mapType(op.returnType) << " " << op.name << "(";
        for (size_t i = 0; i < op.params.size(); ++i) {
            auto& p = op.params[i];
            oss_ << p.kind << " " << mapType(p.type) << " " << p.name;
            if (i + 1 < op.params.size()) oss_ << ", ";
        }
        oss_ << ");\n";
    }

    std::string mapType(const std::string& eaType) {
        static const std::unordered_map<std::string, std::string> typeMap = {
            {"int",     "long"},   {"int32",   "long"},
            {"uint32",  "unsigned long"},
            {"int64",   "long long"}, {"uint64", "unsigned long long"},
            {"float",   "float"},  {"double",  "double"},
            {"bool",    "boolean"},{"string",  "string"},
            {"void",    "void"},
        };
        auto it = typeMap.find(eaType);
        return it != typeMap.end() ? it->second : eaType;
    }

    void indent(int depth) {
        for (int i = 0; i < depth * 4; ++i) oss_ << ' ';
    }
};
