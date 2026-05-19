// ── EARepository.h : DB 읽기 & 모델 조립 ───────────────

#include "Database.h"
#include "EAModel.h"
#include <unordered_map>

class EARepository {
public:
    explicit EARepository(const std::string& qeaPath)
        : db_(qeaPath) { load(); }

    // 외부에서 조회
    const EAPackage*  findPackage(int id)  const { return lookup(packages_, id); }
    const EAObject*   findObject (int id)  const { return lookup(objects_,  id); }

    std::vector<const EAObject*> objectsInPackage(int pkgId) const {
        std::vector<const EAObject*> result;
        for (auto& [id, obj] : objects_)
            if (obj.packageId == pkgId) result.push_back(&obj);
        return result;
    }

    std::vector<EAConnector> connectorsOf(int objId) const {
        std::vector<EAConnector> result;
        for (auto& c : connectors_)
            if (c.startObjId == objId || c.endObjId == objId)
                result.push_back(c);
        return result;
    }

    const std::unordered_map<int, EAPackage>& allPackages() const { return packages_; }
    const std::unordered_map<int, EAObject>&  allObjects()  const { return objects_;  }

private:
    Database db_;
    std::unordered_map<int, EAPackage>  packages_;
    std::unordered_map<int, EAObject>   objects_;
    std::vector<EAConnector>            connectors_;

    void load() {
        loadPackages();
        loadObjects();
        loadAttributes();
        loadOperations();   // 내부에서 loadParams() 호출
        loadConnectors();
    }

    void loadPackages() {
        auto stmt = db_.prepare(
            "SELECT Package_ID, Name, Parent_ID FROM t_package");
        stmt.query([&](Statement& row) {
            EAPackage pkg;
            pkg.id       = row.getInt(0);
            pkg.name     = row.getText(1);
            pkg.parentId = row.getInt(2);
            packages_[pkg.id] = pkg;
        });
    }

    void loadObjects() {
        auto stmt = db_.prepare(
            "SELECT Object_ID, Name, Object_Type, Stereotype, Package_ID "
            "FROM t_object "
            "WHERE Object_Type IN ('Class','Interface','Enumeration')");
        stmt.query([&](Statement& row) {
            EAObject obj;
            obj.id        = row.getInt(0);
            obj.name      = row.getText(1);
            obj.objType   = row.getText(2);
            obj.stereotype= row.getText(3);
            obj.packageId = row.getInt(4);
            objects_[obj.id] = obj;
        });
    }

    void loadAttributes() {
        auto stmt = db_.prepare(
            "SELECT ID, Object_ID, Name, Type, Stereotype, Default, LowerBound "
            "FROM t_attribute ORDER BY Pos");
        stmt.query([&](Statement& row) {
            int objId = row.getInt(1);
            if (!objects_.count(objId)) return;
            EAAttribute attr;
            attr.id         = row.getInt(0);
            attr.name       = row.getText(2);
            attr.type       = row.getText(3);
            attr.stereotype = row.getText(4);
            attr.defaultVal = row.getText(5);
            attr.isReadOnly = (row.getText(6) == "1");
            objects_[objId].attributes.push_back(attr);
        });
    }

    void loadOperations() {
        auto stmt = db_.prepare(
            "SELECT OperationID, Object_ID, Name, Type, Stereotype "
            "FROM t_operation ORDER BY Pos");
        stmt.query([&](Statement& row) {
            int objId = row.getInt(1);
            if (!objects_.count(objId)) return;
            EAOperation op;
            op.id         = row.getInt(0);
            op.name       = row.getText(2);
            op.returnType = row.getText(3);
            op.stereotype = row.getText(4);
            op.params     = loadParams(op.id);
            objects_[objId].operations.push_back(op);
        });
    }

    std::vector<EAParam> loadParams(int opId) {
        std::vector<EAParam> result;
        auto stmt = db_.prepare(
            "SELECT Name, Type, Kind, Default "
            "FROM t_operationparams WHERE OperationID = ? ORDER BY Pos");
        stmt.bind(1, opId).query([&](Statement& row) {
            EAParam p;
            p.name       = row.getText(0);
            p.type       = row.getText(1);
            p.kind       = row.getText(2);  // in/out/inout
            p.defaultVal = row.getText(3);
            result.push_back(p);
        });
        return result;
    }

    void loadConnectors() {
        auto stmt = db_.prepare(
            "SELECT Connector_ID, Connector_Type, "
            "Start_Object_ID, End_Object_ID, Stereotype "
            "FROM t_connector");
        stmt.query([&](Statement& row) {
            EAConnector c;
            c.id         = row.getInt(0);
            c.connType   = row.getText(1);
            c.startObjId = row.getInt(2);
            c.endObjId   = row.getInt(3);
            c.stereotype = row.getText(4);
            connectors_.push_back(c);
        });
    }

    template<typename Map>
    const typename Map::mapped_type* lookup(const Map& m, int id) const {
        auto it = m.find(id);
        return it != m.end() ? &it->second : nullptr;
    }
};
