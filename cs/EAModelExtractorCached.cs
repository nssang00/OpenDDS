using System;
using System.Collections.Generic;
using System.Linq;
using System.Xml.Linq;
using EAtoIDL.Model;

namespace EAtoIDL.Extractor
{
    /// <summary>
    /// 완전 SQL 기반 추출기. Automation API COM 호출을 최소화합니다.
    ///
    /// COM 호출:
    ///   _repo.SQLQuery() 총 5~6회 (일괄 조회)
    ///   _repo.Models     루트 Package_ID 확인용 1회 (최상위 순회만)
    ///
    /// 흐름:
    ///   Pass 0 — t_package SQL 1회 → 전체 패키지 트리 메모리 구성
    ///   Pass 1 — t_object  SQL 1회 → 전체 요소 로드 + 패키지 배정
    ///   Pass 2 — t_attribute SQL 1회 → 전체 속성 로드 + 필드/리터럴/alias 배정
    ///   Pass 3 — t_connector SQL 1회 → 상속 관계 Pending 등록
    ///   Pass 4 — 딕셔너리 조회만으로 참조 해석 (GetElementByID 없음)
    /// </summary>
    public class EAModelExtractorCached
    {
        private readonly EA.Repository _repo;

        /// <summary>GUID → ModelElement. IDL 생성기에 전달됩니다.</summary>
        private readonly Dictionary<string, ModelElement> _byGuid =
            new Dictionary<string, ModelElement>(StringComparer.OrdinalIgnoreCase);

        /// <summary>ElementID(int) → ModelElement. 참조 해석 전용.</summary>
        private readonly Dictionary<int, ModelElement> _byElemId =
            new Dictionary<int, ModelElement>();

        /// <summary>PackageID(int) → ModelPackage. 요소 배정 전용.</summary>
        private readonly Dictionary<int, ModelPackage> _pkgById =
            new Dictionary<int, ModelPackage>();

        private readonly List<PendingParent>    _pendingParents    = new List<PendingParent>();
        private readonly List<PendingFieldType> _pendingFieldTypes = new List<PendingFieldType>();

        public EAModelExtractorCached(EA.Repository repo)
        {
            _repo = repo;
        }

        // ─────────────────────────────────────────────────────────────────
        //  공개 API
        // ─────────────────────────────────────────────────────────────────

        public ExtractionResult Extract(string rootPackageName = null)
        {
            Console.WriteLine("    [Pass 0] 패키지 로드 (t_package SQL) ...");
            var roots = LoadPackageTree(rootPackageName);

            Console.WriteLine("    [Pass 1] 요소 로드 (t_object SQL) ...");
            LoadElements();

            Console.WriteLine("    [Pass 2] 속성 로드 (t_attribute SQL) ...");
            LoadAttributes();

            Console.WriteLine("    [Pass 3] TaggedValue 로드 (t_objectproperties SQL) ...");
            FillDataTypeNamesFromTaggedValues();

            Console.WriteLine("    [Pass 4] 상속/alias 로드 (t_connector SQL) ...");
            LoadGeneralizations();

            Console.WriteLine("    [Pass 5] 요소 어노테이션/Notes 로드 ...");
            LoadElementAnnotations();

            Console.WriteLine("    [Pass 6] 필드 어노테이션/Notes 로드 ...");
            LoadFieldAnnotations();

            Console.WriteLine("    [Pass 7] 참조 해석 ...");
            ResolveAllReferences();

            Console.WriteLine($"    완료: 요소 {_byGuid.Count}개");
            return new ExtractionResult { Packages = roots, ByGuid = _byGuid };
        }

        // ─────────────────────────────────────────────────────────────────
        //  Pass 0 — t_package 전체를 SQL 1회로 로드 → 메모리 트리 구성
        // ─────────────────────────────────────────────────────────────────

        private List<ModelPackage> LoadPackageTree(string rootPackageName)
        {
            // t_package 전체 로드 — COM eaModel.Packages 순회 없음
            const string sql =
                "SELECT Package_ID, Parent_ID, Name, ea_guid FROM t_package";

            var doc = XDocument.Parse(_repo.SQLQuery(sql));

            // 1단계: 모든 패키지 객체 생성
            var parentIdOf = new Dictionary<int, int>();  // Package_ID → Parent_ID

            foreach (var row in doc.Descendants("Row"))
            {
                int pkgId    = 0;
                int parentId = 0;
                int.TryParse(XVal(row, "Package_ID"), out pkgId);
                int.TryParse(XVal(row, "Parent_ID"),  out parentId);
                if (pkgId <= 0) continue;

                var pkg = new ModelPackage
                {
                    PackageID = pkgId,
                    Guid      = XVal(row, "ea_guid"),
                    Name      = XVal(row, "Name")
                };

                _pkgById[pkgId]    = pkg;
                parentIdOf[pkgId]  = parentId;
            }

            // 2단계: Parent-Child 연결
            foreach (var kv in parentIdOf)
            {
                ModelPackage child;
                ModelPackage parent;
                if (!_pkgById.TryGetValue(kv.Key,   out child))  continue;
                if (!_pkgById.TryGetValue(kv.Value, out parent)) continue;

                child.Parent = parent;
                parent.SubPackages.Add(child);
            }

            // 3단계: 루트 결정 — Parent가 없는 패키지의 자식들이 실제 모델 루트
            // EA 구조: 최상위(Parent_ID=0)는 "Model" 노드, 그 아래가 실제 패키지
            var topLevel = _pkgById.Values
                .Where(p => p.Parent == null)
                .SelectMany(p => p.SubPackages)
                .ToList();

            if (rootPackageName == null)
                return topLevel;

            var filtered = topLevel
                .Where(p => p.Name.Equals(rootPackageName, StringComparison.OrdinalIgnoreCase))
                .ToList();

            return filtered.Count > 0 ? filtered : topLevel;
        }

        // ─────────────────────────────────────────────────────────────────
        //  Pass 1 — t_object 전체를 SQL 1회로 로드
        // ─────────────────────────────────────────────────────────────────

        private void LoadElements()
        {
            if (_pkgById.Count == 0) return;

            // _pkgById에 포함된 Package_ID 전체 대상 조회
            string ids = string.Join(",", _pkgById.Keys);
            string sql = string.Format(
                "SELECT Object_ID, Name, Object_Type, Stereotype, Classifier, Package_ID, ea_guid, Note " +
                "FROM t_object " +
                "WHERE Object_Type IN ('Class','Enumeration','DataType') " +
                "  AND Package_ID IN ({0})",
                ids);

            var doc = XDocument.Parse(_repo.SQLQuery(sql));
            foreach (var row in doc.Descendants("Row"))
            {
                string objType = XVal(row, "Object_Type");
                ElementKind kind;
                switch (objType)
                {
                    case "Class":       kind = ElementKind.Struct;   break;
                    case "Enumeration": kind = ElementKind.Enum;     break;
                    case "DataType":    kind = ElementKind.DataType; break;
                    default:            continue;
                }

                int objId = 0;
                int pkgId = 0;
                int.TryParse(XVal(row, "Object_ID"),  out objId);
                int.TryParse(XVal(row, "Package_ID"), out pkgId);
                if (objId <= 0) continue;

                ModelPackage pkg;
                if (!_pkgById.TryGetValue(pkgId, out pkg)) continue;

                // t_object.Classifier = DataType의 분류자 ID (우선순위2 대비 미리 저장)
                int classifierId = 0;
                int.TryParse(XVal(row, "Classifier"), out classifierId);

                var elem = new ModelElement
                {
                    Guid                 = XVal(row, "ea_guid"),
                    Name                 = XVal(row, "Name"),
                    Kind                 = kind,
                    Stereotype           = XVal(row, "Stereotype"),
                    Package              = pkg,
                    DataTypeClassifierID = classifierId,
                    Notes                = NullIfEmpty(XVal(row, "Note"))
                };

                pkg.Elements.Add(elem);
                _byGuid[elem.Guid] = elem;
                _byElemId[objId]   = elem;
            }
        }

        // ─────────────────────────────────────────────────────────────────
        //  Pass 2 — t_attribute 전체를 SQL 1회로 로드
        // ─────────────────────────────────────────────────────────────────

        private void LoadAttributes()
        {
            if (_byElemId.Count == 0) return;

            string ids = string.Join(",", _byElemId.Keys);
            string sql = string.Format(
                "SELECT ID, Object_ID, Name, Type, Classifier, LowerBound, UpperBound, [Default], Notes, Pos " +
                "FROM t_attribute " +
                "WHERE Object_ID IN ({0}) " +
                "ORDER BY Object_ID, Pos",
                ids);

            var doc = XDocument.Parse(_repo.SQLQuery(sql));
            foreach (var row in doc.Descendants("Row"))
            {
                int objId = 0;
                int.TryParse(XVal(row, "Object_ID"), out objId);

                ModelElement elem;
                if (!_byElemId.TryGetValue(objId, out elem)) continue;

                int classifierId = 0;
                int.TryParse(XVal(row, "Classifier"), out classifierId);

                switch (elem.Kind)
                {
                    case ElementKind.Struct:
                    {
                        int attrId = 0;
                        int.TryParse(XVal(row, "ID"), out attrId);

                        var field = new ModelField
                        {
                            AttrId       = attrId,
                            Name         = XVal(row, "Name"),
                            RawTypeName  = XVal(row, "Type"),
                            ClassifierID = classifierId,
                            LowerBound   = NullIfEmpty(XVal(row, "LowerBound")),
                            UpperBound   = NullIfEmpty(XVal(row, "UpperBound")),
                            Notes        = NullIfEmpty(XVal(row, "Notes"))
                        };
                        elem.Fields.Add(field);

                        if (classifierId > 0)
                            _pendingFieldTypes.Add(new PendingFieldType(field, classifierId));
                        break;
                    }
                    case ElementKind.Enum:
                    {
                        elem.Literals.Add(new EnumLiteral
                        {
                            Name  = XVal(row, "Name"),
                            Value = NullIfEmpty(XVal(row, "Default")),
                            Notes = NullIfEmpty(XVal(row, "Notes"))
                        });
                        break;
                    }
                    case ElementKind.DataType:
                    {
                        // 첫 번째 Attribute만 alias 대상으로 사용 (Pos 오름차순이므로 첫 행)
                        if (elem.AliasRawTypeName == null)
                        {
                            string firstType      = NullIfEmpty(XVal(row, "Type"));
                            elem.AliasRawTypeName = firstType != null ? firstType : XVal(row, "Name");

                            if (classifierId > 0)
                                elem.DataTypeClassifierID = classifierId;
                        }
                        break;
                    }
                }
            }

            // DataType 중 Attribute가 없는 경우 → t_object.Classifier 로 이름 보완
            FillDataTypeNamesFromClassifier();
        }

        /// <summary>
        /// DataType에 Attribute가 없고 DataTypeClassifierID만 있는 경우,
        /// t_object SQL로 이름을 한 번에 조회합니다.
        /// </summary>
        private void FillDataTypeNamesFromClassifier()
        {
            var needIds = _byElemId.Values
                .Where(e => e.Kind == ElementKind.DataType
                         && e.AliasRawTypeName == null
                         && e.DataTypeClassifierID > 0)
                .Select(e => e.DataTypeClassifierID)
                .Distinct()
                .ToList();

            if (needIds.Count == 0)
            {
                // 그래도 이름 없는 DataType은 폴백
                foreach (var e in _byElemId.Values)
                    if (e.Kind == ElementKind.DataType && e.AliasRawTypeName == null)
                        e.AliasRawTypeName = "octet";
                return;
            }

            string sql = string.Format(
                "SELECT Object_ID, Name FROM t_object WHERE Object_ID IN ({0})",
                string.Join(",", needIds));

            var doc      = XDocument.Parse(_repo.SQLQuery(sql));
            var nameById = new Dictionary<int, string>();
            foreach (var row in doc.Descendants("Row"))
            {
                int id = 0;
                int.TryParse(XVal(row, "Object_ID"), out id);
                nameById[id] = XVal(row, "Name");
            }

            foreach (var e in _byElemId.Values)
            {
                if (e.Kind != ElementKind.DataType || e.AliasRawTypeName != null) continue;
                string name;
                e.AliasRawTypeName = nameById.TryGetValue(e.DataTypeClassifierID, out name)
                    ? name
                    : "octet";
            }
        }

        // ─────────────────────────────────────────────────────────────────
        //  Pass 3 — t_objectproperties 에서 DataType alias 이름 보완
        //  우선순위 3: Attribute도 없고 ClassifierID도 없는 DataType 전용
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// AliasRawTypeName이 아직 null인 DataType에 대해
        /// t_objectproperties(TaggedValue)에서 type/baseType/aliasedType 을 일괄 조회합니다.
        /// </summary>
        private void FillDataTypeNamesFromTaggedValues()
        {
            // 아직 이름이 없는 DataType Object_ID 수집
            var targetIds = _byElemId
                .Where(kv => kv.Value.Kind == ElementKind.DataType
                          && kv.Value.AliasRawTypeName == null)
                .Select(kv => kv.Key)
                .ToList();

            if (targetIds.Count == 0) return;

            string ids = string.Join(",", targetIds);
            string sql = string.Format(
                "SELECT Object_ID, Value FROM t_objectproperties " +
                "WHERE Object_ID IN ({0}) " +
                "  AND LOWER(Property) IN ('type','basetype','aliasedtype')",
                ids);

            var doc = XDocument.Parse(_repo.SQLQuery(sql));

            // Object_ID당 첫 번째 매칭 값만 사용
            var valueById = new Dictionary<int, string>();
            foreach (var row in doc.Descendants("Row"))
            {
                int id = 0;
                int.TryParse(XVal(row, "Object_ID"), out id);
                if (id > 0 && !valueById.ContainsKey(id))
                    valueById[id] = XVal(row, "Value");
            }

            foreach (var kv in _byElemId)
            {
                var elem = kv.Value;
                if (elem.Kind != ElementKind.DataType || elem.AliasRawTypeName != null) continue;

                string val;
                if (valueById.TryGetValue(kv.Key, out val) && !string.IsNullOrWhiteSpace(val))
                    elem.AliasRawTypeName = val;
                // null이면 우선순위 4(Generalization)에서 처리
            }
        }

        // ─────────────────────────────────────────────────────────────────
        //  Pass 4 — t_connector(Generalization) 전체를 SQL 1회로 로드
        //  Struct  → _pendingParents (상속)
        //  DataType → AliasRawTypeName / DataTypeClassifierID (alias 대상)
        // ─────────────────────────────────────────────────────────────────

        private void LoadGeneralizations()
        {
            if (_byElemId.Count == 0) return;

            string ids = string.Join(",", _byElemId.Keys);
            string sql = string.Format(
                "SELECT Start_Object_ID, End_Object_ID FROM t_connector " +
                "WHERE Connector_Type='Generalization' AND Start_Object_ID IN ({0})",
                ids);

            var doc  = XDocument.Parse(_repo.SQLQuery(sql));
            var seen = new HashSet<int>();  // 자식당 첫 번째 부모만

            // 부모 이름 조회용 ID 수집 (DataType 우선순위4 에서 필요)
            var dataTypeParentIds = new List<int>();

            foreach (var row in doc.Descendants("Row"))
            {
                int childId  = 0;
                int parentId = 0;
                int.TryParse(XVal(row, "Start_Object_ID"), out childId);
                int.TryParse(XVal(row, "End_Object_ID"),   out parentId);

                if (childId <= 0 || parentId <= 0) continue;
                if (!seen.Add(childId)) continue;

                ModelElement childElem;
                if (!_byElemId.TryGetValue(childId, out childElem)) continue;

                if (childElem.Kind == ElementKind.Struct)
                {
                    // Struct: 상속 관계 → _pendingParents
                    _pendingParents.Add(new PendingParent(childElem, parentId));
                }
                else if (childElem.Kind == ElementKind.DataType
                      && childElem.AliasRawTypeName == null)
                {
                    // DataType 우선순위4: 부모 타입을 alias 대상으로 사용
                    childElem.DataTypeClassifierID = parentId;
                    dataTypeParentIds.Add(parentId);
                }
            }

            // DataType 우선순위4 부모 이름 일괄 조회
            if (dataTypeParentIds.Count > 0)
            {
                string parentSql = string.Format(
                    "SELECT Object_ID, Name, ea_guid FROM t_object WHERE Object_ID IN ({0})",
                    string.Join(",", dataTypeParentIds.Distinct()));

                var parentDoc = XDocument.Parse(_repo.SQLQuery(parentSql));
                var nameByParentId = new Dictionary<int, string>();
                var guidByParentId = new Dictionary<int, string>();
                foreach (var row in parentDoc.Descendants("Row"))
                {
                    int pid = 0;
                    int.TryParse(XVal(row, "Object_ID"), out pid);
                    nameByParentId[pid] = XVal(row, "Name");
                    guidByParentId[pid] = XVal(row, "ea_guid");
                }

                foreach (var elem in _byElemId.Values)
                {
                    if (elem.Kind != ElementKind.DataType) continue;
                    if (elem.AliasRawTypeName != null) continue;
                    if (elem.DataTypeClassifierID <= 0) continue;

                    string name;
                    if (nameByParentId.TryGetValue(elem.DataTypeClassifierID, out name))
                        elem.AliasRawTypeName = name;
                    else
                        elem.AliasRawTypeName = "octet";
                }
            }

            // 마지막 폴백: 여전히 이름 없는 DataType
            foreach (var elem in _byElemId.Values)
                if (elem.Kind == ElementKind.DataType && elem.AliasRawTypeName == null)
                    elem.AliasRawTypeName = "octet";
        }

        // ─────────────────────────────────────────────────────────────────
        //  Pass 5 — 요소 레벨 어노테이션 로드 (t_objectproperties)
        //  @key(struct 전체 키), @topic, 사용자 정의 어노테이션
        // ─────────────────────────────────────────────────────────────────

        private void LoadElementAnnotations()
        {
            if (_byElemId.Count == 0) return;

            string ids = string.Join(",", _byElemId.Keys);
            // DDS 관련 태그값: key, topic, extensibility, mutable 등
            string sql = string.Format(
                "SELECT Object_ID, Property, Value FROM t_objectproperties " +
                "WHERE Object_ID IN ({0})",
                ids);

            var doc = XDocument.Parse(_repo.SQLQuery(sql));
            foreach (var row in doc.Descendants("Row"))
            {
                int objId = 0;
                int.TryParse(XVal(row, "Object_ID"), out objId);

                ModelElement elem;
                if (!_byElemId.TryGetValue(objId, out elem)) continue;

                string prop  = XVal(row, "Property").Trim();
                string value = XVal(row, "Value").Trim();

                // DataType alias 해석에 쓰인 태그는 어노테이션에서 제외
                string propLower = prop.ToLowerInvariant();
                if (propLower == "type" || propLower == "basetype" || propLower == "aliasedtype")
                    continue;

                string annotation = BuildAnnotation(prop, value);
                if (annotation != null)
                    elem.Annotations.Add(annotation);
            }
        }

        // ─────────────────────────────────────────────────────────────────
        //  Pass 6 — 필드 레벨 어노테이션 로드 (t_attributetag)
        //  @key(개별 필드), @optional, @id 등
        // ─────────────────────────────────────────────────────────────────

        private void LoadFieldAnnotations()
        {
            // AttrId > 0 인 필드만 수집
            var attrIdToField = new Dictionary<int, ModelField>();
            foreach (var elem in _byGuid.Values)
                foreach (var field in elem.Fields)
                    if (field.AttrId > 0)
                        attrIdToField[field.AttrId] = field;

            if (attrIdToField.Count == 0) return;

            string ids = string.Join(",", attrIdToField.Keys);
            // t_attributetag: ElementID = t_attribute.ID
            string sql = string.Format(
                "SELECT ElementID, Property, VALUE FROM t_attributetag " +
                "WHERE ElementID IN ({0})",
                ids);

            var doc = XDocument.Parse(_repo.SQLQuery(sql));
            foreach (var row in doc.Descendants("Row"))
            {
                int attrId = 0;
                int.TryParse(XVal(row, "ElementID"), out attrId);

                ModelField field;
                if (!attrIdToField.TryGetValue(attrId, out field)) continue;

                string prop  = XVal(row, "Property").Trim();
                string value = XVal(row, "VALUE").Trim();

                string annotation = BuildAnnotation(prop, value);
                if (annotation != null)
                    field.Annotations.Add(annotation);
            }
        }

        /// <summary>
        /// EA TaggedValue Property/Value → IDL DDS 어노테이션 문자열 변환.
        /// 인식되지 않는 태그는 null 반환 (어노테이션 제외).
        /// </summary>
        private static string BuildAnnotation(string prop, string value)
        {
            string lower = prop.ToLowerInvariant();

            // boolean 플래그: value가 "true"일 때만 어노테이션 추가
            if (lower == "key")
                return (value.ToLowerInvariant() == "true" || value == "1") ? "@key" : null;

            if (lower == "optional")
                return (value.ToLowerInvariant() == "true" || value == "1") ? "@optional" : null;

            // 값이 있는 어노테이션 — 큰따옴표 포함 문자열은 string.Format 사용 (C# 7.3 호환)
            if (lower == "id" && !string.IsNullOrEmpty(value))
                return string.Format("@id({0})", value);

            if (lower == "topic" && !string.IsNullOrEmpty(value))
                return string.Format("@topic(name=\"{0}\")", value);

            if (lower == "extensibility" && !string.IsNullOrEmpty(value))
                return string.Format("@extensibility({0})", value.ToUpperInvariant());

            if (lower == "verbatim" && !string.IsNullOrEmpty(value))
                return string.Format("@verbatim(language=\"IDL\", text=\"{0}\")", value);

            // @ 접두사가 붙은 사용자 정의 어노테이션
            if (prop.StartsWith("@"))
                return string.IsNullOrEmpty(value) ? prop : string.Format("{0}({1})", prop, value);

            return null;
        }

        // ─────────────────────────────────────────────────────────────────
        //  Pass 7 — 참조 해석 (딕셔너리 조회만, COM 호출 없음)
        // ─────────────────────────────────────────────────────────────────

        private void ResolveAllReferences()
        {
            // 상속 부모
            foreach (var p in _pendingParents)
            {
                ModelElement parentElem;
                if (_byElemId.TryGetValue(p.ParentElementID, out parentElem))
                {
                    p.Child.ParentElement = parentElem;
                    p.Child.ParentGuid    = parentElem.Guid;
                }
                // 범위 밖 부모 → 상속 없이 생성
            }

            // 필드 타입
            foreach (var p in _pendingFieldTypes)
            {
                ModelElement typeElem;
                if (_byElemId.TryGetValue(p.ClassifierID, out typeElem))
                    p.Field.ResolvedType = typeElem;
                // 범위 밖 타입 → RawTypeName → TypeMapper 폴백
            }

            // DataType alias
            foreach (var elem in _byGuid.Values)
            {
                if (elem.DataTypeClassifierID <= 0) continue;

                ModelElement aliasElem;
                if (_byElemId.TryGetValue(elem.DataTypeClassifierID, out aliasElem))
                {
                    elem.AliasResolvedElement = aliasElem;
                    elem.AliasTypeGuid        = aliasElem.Guid;
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────
        //  헬퍼
        // ─────────────────────────────────────────────────────────────────

        private static string XVal(XElement row, string name)
        {
            var el = row.Element(name);
            return el != null ? el.Value : string.Empty;
        }

        private static string NullIfEmpty(string s) =>
            string.IsNullOrWhiteSpace(s) ? null : s;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Pending 참조 레코드
    // ─────────────────────────────────────────────────────────────────────

    internal class PendingParent
    {
        public ModelElement Child           { get; set; }
        public int          ParentElementID { get; set; }

        public PendingParent(ModelElement child, int parentElementID)
        {
            Child           = child;
            ParentElementID = parentElementID;
        }
    }

    internal class PendingFieldType
    {
        public ModelField Field        { get; set; }
        public int        ClassifierID { get; set; }

        public PendingFieldType(ModelField field, int classifierID)
        {
            Field        = field;
            ClassifierID = classifierID;
        }
    }
}
