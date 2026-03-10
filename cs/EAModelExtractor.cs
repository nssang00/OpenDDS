using System;
using System.Collections.Generic;
using System.Linq;
using System.Xml.Linq;
using EAtoIDL.Model;

namespace EAtoIDL.Extractor
{
    /// <summary>
    /// Extract() 의 반환값.
    /// netstandard2.0 에서 named tuple 대신 사용합니다.
    /// </summary>
    public class ExtractionResult
    {
        public List<ModelPackage>               Packages { get; set; }
        public Dictionary<string, ModelElement> ByGuid   { get; set; }
    }

    /// <summary>
    /// Sparx EA Automation API를 사용해 패키지 트리를 순회하고
    /// 내부 모델(ModelPackage / ModelElement)을 구성합니다.
    /// </summary>
    public class EAModelExtractor
    {
        private readonly EA.Repository _repo;

        /// <summary>GUID → 요소 조회용 전역 사전 (참조 해석에 사용).</summary>
        private readonly Dictionary<string, ModelElement> _byGuid =
            new Dictionary<string, ModelElement>(StringComparer.OrdinalIgnoreCase);

        public EAModelExtractor(EA.Repository repo)
        {
            _repo = repo;
        }

        // ─────────────────────────────────────────────────────────────────
        //  공개 API
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// 모델 루트에서 추출을 시작합니다.
        /// </summary>
        /// <param name="rootPackageName">
        ///   null 이면 최상위 모든 패키지, 값을 주면 해당 이름의 패키지만 추출.
        /// </param>
        public ExtractionResult Extract(string rootPackageName = null)
        {
            var roots = new List<ModelPackage>();

            foreach (EA.Package eaModel in _repo.Models)
            {
                foreach (EA.Package eaChild in eaModel.Packages)
                {
                    if (rootPackageName != null &&
                        !eaChild.Name.Equals(rootPackageName, StringComparison.OrdinalIgnoreCase))
                        continue;

                    roots.Add(TraversePackage(eaChild, parent: null));
                }
            }

            ResolveAllReferences();
            return new ExtractionResult { Packages = roots, ByGuid = _byGuid };
        }

        // ─────────────────────────────────────────────────────────────────
        //  패키지 순회
        // ─────────────────────────────────────────────────────────────────

        private ModelPackage TraversePackage(EA.Package eaPkg, ModelPackage parent)
        {
            var pkg = new ModelPackage
            {
                Guid   = eaPkg.PackageGUID,
                Name   = eaPkg.Name,
                Parent = parent
            };

            // 이 패키지에 속한 요소 추출
            foreach (EA.Element eaElem in eaPkg.Elements)
            {
                var elem = TryExtractElement(eaElem, pkg);
                if (elem == null) continue;

                pkg.Elements.Add(elem);
                _byGuid[elem.Guid] = elem;
            }

            // 하위 패키지 재귀
            foreach (EA.Package child in eaPkg.Packages)
                pkg.SubPackages.Add(TraversePackage(child, pkg));

            return pkg;
        }

        // ─────────────────────────────────────────────────────────────────
        //  요소 추출
        // ─────────────────────────────────────────────────────────────────

        private ModelElement TryExtractElement(EA.Element eaElem, ModelPackage pkg)
        {
            // 지원 타입 필터링
            ElementKind kind;
            switch (eaElem.Type)
            {
                case "Class":       kind = ElementKind.Struct;   break;
                case "Enumeration": kind = ElementKind.Enum;     break;
                case "DataType":    kind = ElementKind.DataType; break;
                default:            return null;                  // Interface 등 스킵
            }

            var elem = new ModelElement
            {
                Guid       = eaElem.ElementGUID,
                Name       = eaElem.Name,
                Kind       = kind,
                Stereotype = eaElem.Stereotype,
                Package    = pkg
            };

            switch (kind)
            {
                case ElementKind.Struct:
                    ExtractStructMembers(eaElem, elem);
                    break;
                case ElementKind.Enum:
                    ExtractEnumLiterals(eaElem, elem);
                    break;
                case ElementKind.DataType:
                    ExtractDataType(eaElem, elem);
                    break;
            }

            return elem;
        }

        // ── Struct ─────────────────────────────────────────────────────────

        private void ExtractStructMembers(EA.Element eaElem, ModelElement elem)
        {
            // ── 필드: SQL 1회로 전체 속성 조회 ─────────────────────────────
            // COM foreach(Attributes) 대비 프로세스 간 호출 횟수를 대폭 줄입니다.
            string attrSql = string.Format(
                "SELECT Name, Type, Classifier, LowerBound, UpperBound " +
                "FROM t_attribute WHERE Object_ID={0} ORDER BY Pos",
                eaElem.ElementID);

            var attrDoc = XDocument.Parse(_repo.SQLQuery(attrSql));
            foreach (var row in attrDoc.Descendants("Row"))
            {
                int classifierId = 0;
                int.TryParse(XVal(row, "Classifier"), out classifierId);

                elem.Fields.Add(new ModelField
                {
                    Name         = XVal(row, "Name"),
                    RawTypeName  = XVal(row, "Type"),
                    ClassifierID = classifierId,
                    LowerBound   = NullIfEmpty(XVal(row, "LowerBound")),
                    UpperBound   = NullIfEmpty(XVal(row, "UpperBound"))
                });
            }

            // ── 상속 부모: SQL 1회로 Generalization 조회 ───────────────────
            string connSql = string.Format(
                "SELECT End_Object_ID FROM t_connector " +
                "WHERE Connector_Type='Generalization' AND Start_Object_ID={0}",
                eaElem.ElementID);

            var connDoc = XDocument.Parse(_repo.SQLQuery(connSql));
            foreach (var row in connDoc.Descendants("Row"))
            {
                int supplierId = 0;
                if (int.TryParse(XVal(row, "End_Object_ID"), out supplierId) && supplierId > 0)
                {
                    // GetElementByID 대신 t_object SQL 로 GUID 직접 조회
                    // → 범위 밖 요소이거나 삭제된 요소여도 예외 없음
                    string parentGuid = QueryGuidById(supplierId);
                    if (parentGuid != null)
                    {
                        elem.ParentGuid = parentGuid;
                        break; // 단일 상속
                    }
                }
            }
        }

        // ── Enum ───────────────────────────────────────────────────────────

        private void ExtractEnumLiterals(EA.Element eaElem, ModelElement elem)
        {
            // SQL 1회로 열거형 리터럴 전체 조회
            string sql = string.Format(
                "SELECT Name, Default FROM t_attribute WHERE Object_ID={0} ORDER BY Pos",
                eaElem.ElementID);

            var doc = XDocument.Parse(_repo.SQLQuery(sql));
            foreach (var row in doc.Descendants("Row"))
            {
                elem.Literals.Add(new EnumLiteral
                {
                    Name  = XVal(row, "Name"),
                    Value = NullIfEmpty(XVal(row, "Default"))
                });
            }
        }

        // ── DataType ───────────────────────────────────────────────────────

        private void ExtractDataType(EA.Element eaElem, ModelElement elem)
        {
            // 우선순위 1: SQL로 첫 번째 Attribute 조회 (COM 호출 최소화)
            {
                string sql = string.Format(
                    "SELECT Name, Type, Classifier FROM t_attribute " +
                    "WHERE Object_ID={0} ORDER BY Pos",
                    eaElem.ElementID);
                var doc  = XDocument.Parse(_repo.SQLQuery(sql));
                var first = doc.Descendants("Row").FirstOrDefault();
                if (first != null)
                {
                    string firstType      = NullIfEmpty(XVal(first, "Type"));
                    elem.AliasRawTypeName = firstType != null ? firstType : XVal(first, "Name");

                    int classifierId = 0;
                    if (int.TryParse(XVal(first, "Classifier"), out classifierId) && classifierId > 0)
                        elem.AliasTypeGuid = QueryGuidById(classifierId);  // null-safe
                    return;
                }
            }

            // 우선순위 2: EA.Element.ClassifierID — t_object SQL 로 이름+GUID 조회
            if (eaElem.ClassifierID > 0)
            {
                string sql2 = string.Format(
                    "SELECT Name, ea_guid FROM t_object WHERE Object_ID={0}",
                    eaElem.ClassifierID);
                var doc2 = XDocument.Parse(_repo.SQLQuery(sql2));
                var row2 = doc2.Descendants("Row").FirstOrDefault();
                if (row2 != null)
                {
                    elem.AliasRawTypeName = XVal(row2, "Name");
                    elem.AliasTypeGuid    = NullIfEmpty(XVal(row2, "ea_guid"));
                    return;
                }
            }

            // 우선순위 3: Tagged Value "type" / "baseType" / "aliasedType" — SQL 조회
            {
                string sql = string.Format(
                    "SELECT Property, VALUE FROM t_objectproperties " +
                    "WHERE Object_ID={0} AND LOWER(Property) IN ('type','basetype','aliasedtype')",
                    eaElem.ElementID);
                var doc = XDocument.Parse(_repo.SQLQuery(sql));
                var tvRow = doc.Descendants("Row").FirstOrDefault();
                if (tvRow != null)
                {
                    elem.AliasRawTypeName = NullIfEmpty(XVal(tvRow, "VALUE"));
                    return;
                }
            }

            // 우선순위 4: Generalization (부모 타입을 alias 대상으로)
            {
                string sql = string.Format(
                    "SELECT End_Object_ID FROM t_connector " +
                    "WHERE Connector_Type='Generalization' AND Start_Object_ID={0}",
                    eaElem.ElementID);
                var doc = XDocument.Parse(_repo.SQLQuery(sql));
                foreach (var row in doc.Descendants("Row"))
                {
                    int supplierId = 0;
                    if (int.TryParse(XVal(row, "End_Object_ID"), out supplierId) && supplierId > 0)
                    {
                        string sql4 = string.Format(
                            "SELECT Name, ea_guid FROM t_object WHERE Object_ID={0}", supplierId);
                        var doc4 = XDocument.Parse(_repo.SQLQuery(sql4));
                        var row4 = doc4.Descendants("Row").FirstOrDefault();
                        if (row4 != null)
                        {
                            elem.AliasRawTypeName = XVal(row4, "Name");
                            elem.AliasTypeGuid    = NullIfEmpty(XVal(row4, "ea_guid"));
                            return;
                        }
                    }
                }
            }

            // 폴백: 타입 정보 없음
            elem.AliasRawTypeName = "octet";
        }

        // ─────────────────────────────────────────────────────────────────
        //  전체 참조 해석 (2-Pass)
        // ─────────────────────────────────────────────────────────────────

        private void ResolveAllReferences()
        {
            // ── ClassifierID → ea_guid 변환을 SQL IN 으로 일괄 처리 ─────────
            // 필드별 GetElementByID() 반복 COM 호출을 SQL 1회로 대체합니다.
            var allIds = new HashSet<int>();
            foreach (var elem in _byGuid.Values)
                foreach (var field in elem.Fields)
                    if (field.ClassifierID > 0)
                        allIds.Add(field.ClassifierID);

            var idToGuid = new Dictionary<int, string>();
            if (allIds.Count > 0)
            {
                string ids = string.Join(",", allIds);
                string sql = string.Format(
                    "SELECT Object_ID, ea_guid FROM t_object WHERE Object_ID IN ({0})", ids);
                var doc = XDocument.Parse(_repo.SQLQuery(sql));
                foreach (var row in doc.Descendants("Row"))
                {
                    int id = 0;
                    string guid = XVal(row, "ea_guid");
                    if (int.TryParse(XVal(row, "Object_ID"), out id) && !string.IsNullOrEmpty(guid))
                        idToGuid[id] = guid;
                }
            }

            // ── 참조 해석 ────────────────────────────────────────────────────
            foreach (var elem in _byGuid.Values)
            {
                // 상속 부모 해석
                if (elem.ParentGuid != null)
                {
                    ModelElement parentElem;
                    if (_byGuid.TryGetValue(elem.ParentGuid, out parentElem))
                        elem.ParentElement = parentElem;
                }

                // 필드 타입 해석 — 캐시된 GUID 사용 (COM 호출 없음)
                foreach (var field in elem.Fields)
                {
                    if (field.ClassifierID > 0)
                    {
                        string guid;
                        if (idToGuid.TryGetValue(field.ClassifierID, out guid))
                        {
                            ModelElement typeElem;
                            if (_byGuid.TryGetValue(guid, out typeElem))
                                field.ResolvedType = typeElem;
                        }
                    }
                }

                // DataType alias 해석
                if (elem.AliasTypeGuid != null)
                {
                    ModelElement aliasElem;
                    if (_byGuid.TryGetValue(elem.AliasTypeGuid, out aliasElem))
                        elem.AliasResolvedElement = aliasElem;
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────
        //  헬퍼
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// Object_ID → ea_guid 를 t_object SQL 로 직접 조회합니다.
        /// GetElementByID() 와 달리 ID가 없어도 예외를 던지지 않고 null 을 반환합니다.
        /// </summary>
        private string QueryGuidById(int objectId)
        {
            string sql = string.Format(
                "SELECT ea_guid FROM t_object WHERE Object_ID={0}", objectId);
            var doc = XDocument.Parse(_repo.SQLQuery(sql));
            var row = doc.Descendants("Row").FirstOrDefault();
            if (row == null) return null;
            return NullIfEmpty(XVal(row, "ea_guid"));
        }

        /// <summary>XElement 에서 자식 요소 값을 안전하게 읽습니다.</summary>
        private static string XVal(XElement row, string name)
        {
            var el = row.Element(name);
            return el != null ? el.Value : string.Empty;
        }

        /// <summary>공백/빈 문자열이면 null 반환, 아니면 원본 반환.</summary>
        private static string NullIfEmpty(string s) =>
            string.IsNullOrWhiteSpace(s) ? null : s;
    }
}
