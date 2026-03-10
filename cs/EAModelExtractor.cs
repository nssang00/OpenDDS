using System;
using System.Collections.Generic;
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
            // 속성(필드) 추출
            // EA.Attribute.Classifier 는 t_attribute.Classifier 컬럼 값으로
            // 타입 요소의 GUID 문자열을 직접 반환합니다.
            // 원시 타입(double, long 등)이면 빈 문자열이므로 NullIfEmpty 로 처리합니다.
            foreach (EA.Attribute attr in eaElem.Attributes)
            {
                elem.Fields.Add(new ModelField
                {
                    Name        = attr.Name,
                    RawTypeName = attr.Type,
                    TypeGuid    = NullIfEmpty(attr.Classifier),   // GUID or null
                    UpperBound  = NullIfEmpty(attr.UpperBound),
                    LowerBound  = NullIfEmpty(attr.LowerBound)
                });
            }

            // Generalization 관계 → 상속 부모 찾기
            // EA에서 Generalization: Client=자식, Supplier=부모
            foreach (EA.Connector conn in eaElem.Connectors)
            {
                if (conn.Type != "Generalization") continue;
                if (conn.ClientID != eaElem.ElementID) continue;

                var parentEaElem = _repo.GetElementByID(conn.SupplierID);
                if (parentEaElem != null)
                {
                    elem.ParentGuid = parentEaElem.ElementGUID;
                    break; // 단일 상속만 지원
                }
            }
        }

        // ── Enum ───────────────────────────────────────────────────────────

        private static void ExtractEnumLiterals(EA.Element eaElem, ModelElement elem)
        {
            foreach (EA.Attribute attr in eaElem.Attributes)
            {
                elem.Literals.Add(new EnumLiteral
                {
                    Name  = attr.Name,
                    Value = NullIfEmpty(attr.Default)
                });
            }
        }

        // ── DataType ───────────────────────────────────────────────────────

        private void ExtractDataType(EA.Element eaElem, ModelElement elem)
        {
            // 우선순위 1: 첫 번째 Attribute 에서 aliased type 읽기
            if (eaElem.Attributes.Count > 0)
            {
                EA.Attribute first = (EA.Attribute)eaElem.Attributes.GetAt(0);
                string firstType   = NullIfEmpty(first.Type);
                elem.AliasRawTypeName = firstType != null ? firstType : first.Name;
                elem.AliasTypeGuid    = NullIfEmpty(first.Classifier);  // GUID or null
                return;
            }

            // 우선순위 2: ClassifierID (EA 요소 분류자)
            if (eaElem.ClassifierID > 0)
            {
                var classifier = _repo.GetElementByID(eaElem.ClassifierID);
                if (classifier != null)
                {
                    elem.AliasRawTypeName = classifier.Name;
                    elem.AliasTypeGuid    = classifier.ElementGUID;
                    return;
                }
            }

            // 우선순위 3: Tagged Value "type" 또는 "baseType"
            foreach (EA.TaggedValue tv in eaElem.TaggedValues)
            {
                if (tv.Name.Equals("type",       StringComparison.OrdinalIgnoreCase) ||
                    tv.Name.Equals("baseType",    StringComparison.OrdinalIgnoreCase) ||
                    tv.Name.Equals("aliasedType", StringComparison.OrdinalIgnoreCase))
                {
                    elem.AliasRawTypeName = NullIfEmpty(tv.Value);
                    return;
                }
            }

            // 우선순위 4: Generalization (부모 타입을 alias 대상으로)
            foreach (EA.Connector conn in eaElem.Connectors)
            {
                if (conn.Type != "Generalization") continue;
                if (conn.ClientID != eaElem.ElementID) continue;

                var parentEa = _repo.GetElementByID(conn.SupplierID);
                if (parentEa != null)
                {
                    elem.AliasRawTypeName = parentEa.Name;
                    elem.AliasTypeGuid    = parentEa.ElementGUID;
                    return;
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
            foreach (var elem in _byGuid.Values)
            {
                // 상속 부모 해석
                if (elem.ParentGuid != null)
                {
                    ModelElement parentElem;
                    if (_byGuid.TryGetValue(elem.ParentGuid, out parentElem))
                        elem.ParentElement = parentElem;
                }

                // 필드 타입 해석
                foreach (var field in elem.Fields)
                {
                    if (field.TypeGuid != null)
                    {
                        ModelElement typeElem;
                        if (_byGuid.TryGetValue(field.TypeGuid, out typeElem))
                            field.ResolvedType = typeElem;
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

        /// <summary>공백/빈 문자열이면 null 반환, 아니면 원본 반환.</summary>
        private static string NullIfEmpty(string s) =>
            string.IsNullOrWhiteSpace(s) ? null : s;
    }
}
