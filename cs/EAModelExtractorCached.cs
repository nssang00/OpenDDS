using System;
using System.Collections.Generic;
using System.Linq;
using System.Xml.Linq;
using EAtoIDL.Model;

namespace EAtoIDL.Extractor
{
    /// <summary>
    /// GetAllElements() 기반 캐시 추출기.
    ///
    /// 흐름:
    ///   Pass 0 — GetAllElements() COM 1회 호출로 전체 요소를 일괄 수집.
    ///            ElementID → RawElement 캐시 구축.
    ///
    ///   Pass 1 — 패키지 트리 순회 (패키지 구조 파악 전용).
    ///            각 패키지에 속한 요소는 캐시에서 꺼내 ModelElement 로 변환.
    ///            eaPkg.Elements COM 반복 없음.
    ///
    ///   Pass 2 — Pending 목록 기반 참조 해석.
    ///            GetElementByID() 호출 없음 → "can't find matching id" 예외 없음.
    /// </summary>
    public class EAModelExtractorCached
    {
        private readonly EA.Repository _repo;

        // ── 캐시 ─────────────────────────────────────────────────────────────
        /// <summary>GUID → ModelElement. IDL 생성기에 전달됩니다.</summary>
        private readonly Dictionary<string, ModelElement> _byGuid =
            new Dictionary<string, ModelElement>(StringComparer.OrdinalIgnoreCase);

        /// <summary>ElementID → ModelElement. Pass 2 참조 해석 전용.</summary>
        private readonly Dictionary<int, ModelElement> _byElemId =
            new Dictionary<int, ModelElement>();

        /// <summary>ElementID → EA.Element (Pass 0 에서 구축). 패키지 배정에 사용.</summary>
        private readonly Dictionary<int, EA.Element> _rawById =
            new Dictionary<int, EA.Element>();

        // ── Pending 참조 ─────────────────────────────────────────────────────
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
            // ── Pass 0: GetAllElements() 로 전체 EA.Element 일괄 수집 ──────
            Console.WriteLine("    [Pass 0] GetAllElements() ...");
            foreach (EA.Element eaElem in _repo.GetAllElements(""))
                _rawById[eaElem.ElementID] = eaElem;

            Console.WriteLine($"    [Pass 0] 전체 요소 {_rawById.Count}개 수집 완료");

            // ── Pass 1: 패키지 트리 순회 (구조 파악 + ModelElement 변환) ──
            Console.WriteLine("    [Pass 1] 패키지 트리 순회 ...");
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

            Console.WriteLine($"    [Pass 1] ModelElement {_byGuid.Count}개 변환 완료");

            // ── Pass 2: 참조 해석 ────────────────────────────────────────
            Console.WriteLine("    [Pass 2] 참조 해석 ...");
            ResolveAllReferences();

            return new ExtractionResult { Packages = roots, ByGuid = _byGuid };
        }

        // ─────────────────────────────────────────────────────────────────
        //  Pass 1 — 패키지 구조 순회
        //  eaPkg.Elements 대신 _rawById 캐시에서 해당 패키지 요소를 꺼냄
        // ─────────────────────────────────────────────────────────────────

        private ModelPackage TraversePackage(EA.Package eaPkg, ModelPackage parent)
        {
            var pkg = new ModelPackage
            {
                Guid   = eaPkg.PackageGUID,
                Name   = eaPkg.Name,
                Parent = parent
            };

            // eaPkg.Elements COM 반복 대신 —
            // SQL로 이 패키지에 속한 ElementID 목록만 가져온 뒤 캐시에서 꺼냅니다.
            string sql = string.Format(
                "SELECT Object_ID FROM t_object WHERE Package_ID={0}", eaPkg.PackageID);

            var doc = XDocument.Parse(_repo.SQLQuery(sql));
            foreach (var row in doc.Descendants("Row"))
            {
                int elemId = 0;
                if (!int.TryParse(XVal(row, "Object_ID"), out elemId)) continue;

                EA.Element rawElem;
                if (!_rawById.TryGetValue(elemId, out rawElem)) continue;

                var elem = TryBuildElement(rawElem, pkg);
                if (elem == null) continue;

                pkg.Elements.Add(elem);
                _byGuid[elem.Guid]  = elem;
                _byElemId[elemId]   = elem;
            }

            // 하위 패키지 재귀
            foreach (EA.Package child in eaPkg.Packages)
                pkg.SubPackages.Add(TraversePackage(child, pkg));

            return pkg;
        }

        // ─────────────────────────────────────────────────────────────────
        //  Pass 1 — EA.Element → ModelElement 변환
        // ─────────────────────────────────────────────────────────────────

        private ModelElement TryBuildElement(EA.Element eaElem, ModelPackage pkg)
        {
            ElementKind kind;
            switch (eaElem.Type)
            {
                case "Class":       kind = ElementKind.Struct;   break;
                case "Enumeration": kind = ElementKind.Enum;     break;
                case "DataType":    kind = ElementKind.DataType; break;
                default:            return null;
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
                case ElementKind.Struct:   CollectStructInfo(eaElem, elem);   break;
                case ElementKind.Enum:     CollectEnumLiterals(eaElem, elem); break;
                case ElementKind.DataType: CollectDataTypeInfo(eaElem, elem); break;
            }

            return elem;
        }

        // ─────────────────────────────────────────────────────────────────
        //  필드·리터럴·alias 수집 (SQL 기반)
        // ─────────────────────────────────────────────────────────────────

        private void CollectStructInfo(EA.Element eaElem, ModelElement elem)
        {
            // 필드 — SQL 1회
            string attrSql = string.Format(
                "SELECT Name, Type, Classifier, LowerBound, UpperBound " +
                "FROM t_attribute WHERE Object_ID={0} ORDER BY Pos",
                eaElem.ElementID);

            var attrDoc = XDocument.Parse(_repo.SQLQuery(attrSql));
            foreach (var row in attrDoc.Descendants("Row"))
            {
                int classifierId = 0;
                int.TryParse(XVal(row, "Classifier"), out classifierId);

                var field = new ModelField
                {
                    Name         = XVal(row, "Name"),
                    RawTypeName  = XVal(row, "Type"),
                    ClassifierID = classifierId,
                    LowerBound   = NullIfEmpty(XVal(row, "LowerBound")),
                    UpperBound   = NullIfEmpty(XVal(row, "UpperBound"))
                };
                elem.Fields.Add(field);

                if (classifierId > 0)
                    _pendingFieldTypes.Add(new PendingFieldType(field, classifierId));
            }

            // 상속 부모 — SQL 1회
            string connSql = string.Format(
                "SELECT End_Object_ID FROM t_connector " +
                "WHERE Connector_Type='Generalization' AND Start_Object_ID={0}",
                eaElem.ElementID);

            var connDoc = XDocument.Parse(_repo.SQLQuery(connSql));
            foreach (var row in connDoc.Descendants("Row"))
            {
                int parentId = 0;
                if (int.TryParse(XVal(row, "End_Object_ID"), out parentId) && parentId > 0)
                {
                    _pendingParents.Add(new PendingParent(elem, parentId));
                    break;
                }
            }
        }

        private void CollectEnumLiterals(EA.Element eaElem, ModelElement elem)
        {
            string sql = string.Format(
                "SELECT Name, [Default] FROM t_attribute WHERE Object_ID={0} ORDER BY Pos",
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

        private void CollectDataTypeInfo(EA.Element eaElem, ModelElement elem)
        {
            // 우선순위 1: 첫 번째 Attribute
            string attrSql = string.Format(
                "SELECT Name, Type, Classifier FROM t_attribute " +
                "WHERE Object_ID={0} ORDER BY Pos",
                eaElem.ElementID);

            var attrDoc  = XDocument.Parse(_repo.SQLQuery(attrSql));
            var firstRow = attrDoc.Descendants("Row").FirstOrDefault();
            if (firstRow != null)
            {
                string firstType      = NullIfEmpty(XVal(firstRow, "Type"));
                elem.AliasRawTypeName = firstType != null ? firstType : XVal(firstRow, "Name");

                int classifierId = 0;
                if (int.TryParse(XVal(firstRow, "Classifier"), out classifierId) && classifierId > 0)
                    elem.AliasClassifierID = classifierId;
                return;
            }

            // 우선순위 2: EA.Element.ClassifierID
            if (eaElem.ClassifierID > 0)
            {
                elem.AliasClassifierID = eaElem.ClassifierID;

                string nameSql = string.Format(
                    "SELECT Name FROM t_object WHERE Object_ID={0}", eaElem.ClassifierID);
                var nameDoc = XDocument.Parse(_repo.SQLQuery(nameSql));
                var nameRow = nameDoc.Descendants("Row").FirstOrDefault();
                if (nameRow != null)
                    elem.AliasRawTypeName = XVal(nameRow, "Name");
                return;
            }

            // 우선순위 3: Tagged Value
            string tvSql = string.Format(
                "SELECT VALUE FROM t_objectproperties " +
                "WHERE Object_ID={0} AND LOWER(Property) IN ('type','basetype','aliasedtype')",
                eaElem.ElementID);

            var tvDoc = XDocument.Parse(_repo.SQLQuery(tvSql));
            var tvRow = tvDoc.Descendants("Row").FirstOrDefault();
            if (tvRow != null)
            {
                elem.AliasRawTypeName = NullIfEmpty(XVal(tvRow, "VALUE"));
                return;
            }

            // 우선순위 4: Generalization
            string connSql = string.Format(
                "SELECT End_Object_ID FROM t_connector " +
                "WHERE Connector_Type='Generalization' AND Start_Object_ID={0}",
                eaElem.ElementID);

            var connDoc = XDocument.Parse(_repo.SQLQuery(connSql));
            foreach (var row in connDoc.Descendants("Row"))
            {
                int parentId = 0;
                if (int.TryParse(XVal(row, "End_Object_ID"), out parentId) && parentId > 0)
                {
                    elem.AliasClassifierID = parentId;
                    return;
                }
            }

            elem.AliasRawTypeName = "octet";
        }

        // ─────────────────────────────────────────────────────────────────
        //  Pass 2 — 캐시 기반 참조 해석
        //  _byElemId 딕셔너리 조회만 사용 — GetElementByID() 호출 없음
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
            }

            // 필드 타입
            foreach (var p in _pendingFieldTypes)
            {
                ModelElement typeElem;
                if (_byElemId.TryGetValue(p.ClassifierID, out typeElem))
                    p.Field.ResolvedType = typeElem;
                // 범위 밖 타입: null → RawTypeName → TypeMapper 폴백
            }

            // DataType alias
            foreach (var elem in _byGuid.Values)
            {
                if (elem.AliasClassifierID <= 0) continue;

                ModelElement aliasElem;
                if (_byElemId.TryGetValue(elem.AliasClassifierID, out aliasElem))
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
