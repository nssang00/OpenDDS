using System;
using System.Collections.Generic;
using System.Linq;
using System.Xml.Linq;
using EAtoIDL.Model;

namespace EAtoIDL.Extractor
{
    /// <summary>
    /// ElementID 캐시 기반 추출기.
    ///
    /// 흐름:
    ///   Pass 1 — _repo.Models 부터 패키지 트리를 재귀 순회.
    ///            eaPkg.Elements 로 요소를 수집하면서
    ///            _byGuid / _byElemId 캐시를 동시에 구축.
    ///            필드·상속·alias 참조는 Pending 목록에만 등록.
    ///
    ///   Pass 2 — _byElemId 딕셔너리 조회만으로 모든 참조 해석.
    ///            GetElementByID() 호출 없음
    ///            → "can't find matching id" 예외 없음.
    ///            추출 범위 밖 타입은 null 처리 → TypeMapper 폴백.
    /// </summary>
    public class EAModelExtractorCached
    {
        private readonly EA.Repository _repo;

        /// <summary>GUID → ModelElement. IDL 생성기에 전달됩니다.</summary>
        private readonly Dictionary<string, ModelElement> _byGuid =
            new Dictionary<string, ModelElement>(StringComparer.OrdinalIgnoreCase);

        /// <summary>ElementID(int) → ModelElement. Pass 2 참조 해석 전용.</summary>
        private readonly Dictionary<int, ModelElement> _byElemId =
            new Dictionary<int, ModelElement>();

        // 참조 해석 대기 목록
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
            var roots = new List<ModelPackage>();

            // ── Pass 1: 패키지 트리 순회 ─────────────────────────────────
            // _repo.Models = 최상위 EA.Package 컬렉션
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

            Console.WriteLine($"    요소 수집 완료: {_byGuid.Count}개");

            // ── Pass 2: 캐시 기반 참조 해석 ──────────────────────────────
            ResolveAllReferences();

            return new ExtractionResult { Packages = roots, ByGuid = _byGuid };
        }

        // ─────────────────────────────────────────────────────────────────
        //  Pass 1 — 패키지 재귀 순회
        // ─────────────────────────────────────────────────────────────────

        private ModelPackage TraversePackage(EA.Package eaPkg, ModelPackage parent)
        {
            var pkg = new ModelPackage
            {
                Guid   = eaPkg.PackageGUID,
                Name   = eaPkg.Name,
                Parent = parent
            };

            // eaPkg.Elements: 이 패키지에 직속된 요소들
            // COM 컬렉션을 한 번 순회하면서 _byElemId 캐시도 동시 구축
            foreach (EA.Element eaElem in eaPkg.Elements)
            {
                var elem = TryBuildElement(eaElem, pkg);
                if (elem == null) continue;

                pkg.Elements.Add(elem);
                _byGuid[elem.Guid]          = elem;   // GUID 키 캐시
                _byElemId[eaElem.ElementID] = elem;   // ID 키 캐시 (Pass 2 해석용)
            }

            // 하위 패키지 재귀
            foreach (EA.Package child in eaPkg.Packages)
                pkg.SubPackages.Add(TraversePackage(child, pkg));

            return pkg;
        }

        // ─────────────────────────────────────────────────────────────────
        //  EA.Element → ModelElement 변환
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
        //  필드·리터럴·alias 수집 (SQL 기반, COM 프로퍼티 반복 없음)
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

                // 타입 참조 → Pending 등록 (Pass 2에서 _byElemId 로 해석)
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
                    break; // 단일 상속
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
                    elem.DataTypeClassifierID = classifierId;
                return;
            }

            // 우선순위 2: EA.Element.ClassifierID
            if (eaElem.ClassifierID > 0)
            {
                elem.DataTypeClassifierID = eaElem.ClassifierID;

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
                    elem.DataTypeClassifierID = parentId;
                    return;
                }
            }

            elem.AliasRawTypeName = "octet";
        }

        // ─────────────────────────────────────────────────────────────────
        //  Pass 2 — _byElemId 캐시로 모든 참조 해석
        //  GetElementByID() 호출 없음
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
                // 범위 밖 부모: ParentElement = null → IDL 상속 없이 생성
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
    //  Pending 참조 레코드 (Pass 2 일괄 처리용)
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
