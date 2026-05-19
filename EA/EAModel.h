// ── EAModel.h : 순수 데이터 구조 ──────────────────────

struct EAParam {
    std::string name;
    std::string type;
    std::string kind;       // "in" | "out" | "inout" | "return"
    std::string defaultVal;
};

struct EAOperation {
    int         id;
    std::string name;
    std::string returnType;
    std::string stereotype;
    std::vector<EAParam> params;
};

struct EAAttribute {
    int         id;
    std::string name;
    std::string type;
    std::string stereotype;
    std::string defaultVal;
    bool        isReadOnly = false;
};

struct EAConnector {
    int         id;
    std::string connType;   // "Generalization" | "Association" | "Dependency" ...
    int         startObjId;
    int         endObjId;
    std::string stereotype;
};

struct EAObject {
    int         id;
    std::string name;
    std::string objType;    // "Class" | "Interface" | "Enumeration" ...
    std::string stereotype;
    int         packageId;
    std::vector<EAAttribute> attributes;
    std::vector<EAOperation> operations;
};

struct EAPackage {
    int         id;
    std::string name;
    int         parentId;
    std::vector<int> objectIds;   // 소속 object ID 목록
};
