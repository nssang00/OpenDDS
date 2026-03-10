using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace EAtoIDL.Model
{
    // ─────────────────────────────────────────────────────────────────────────
    //  열거형
    // ─────────────────────────────────────────────────────────────────────────

    public enum ElementKind { Struct, Enum, DataType }

    // ─────────────────────────────────────────────────────────────────────────
    //  패키지
    // ─────────────────────────────────────────────────────────────────────────

    public class ModelPackage
    {
        public int          PackageID   { get; set; }           // t_package.Package_ID
        public string       Guid        { get; set; } = string.Empty;
        public string       Name        { get; set; } = string.Empty;
        /// <summary>null이면 루트 패키지.</summary>
        public ModelPackage Parent      { get; set; }

        public List<ModelPackage> SubPackages { get; } = new List<ModelPackage>();
        public List<ModelElement> Elements    { get; } = new List<ModelElement>();

        /// <summary>루트부터 이 패키지까지의 이름 목록. 모듈/폴더 경로 생성에 사용.</summary>
        public List<string> PathParts()
        {
            var parts = new List<string>();
            ModelPackage cur = this;
            while (cur != null) { parts.Insert(0, cur.Name); cur = cur.Parent; }
            return parts;
        }

        /// <summary>출력 루트 아래에서의 절대 폴더 경로.</summary>
        public string AbsoluteFolder(string outputRoot) =>
            Path.Combine(new[] { outputRoot }.Concat(PathParts()).ToArray());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  요소 (Class / Enumeration / DataType)
    // ─────────────────────────────────────────────────────────────────────────

    public class ModelElement
    {
        public string       Guid       { get; set; } = string.Empty;
        public string       Name       { get; set; } = string.Empty;
        public ElementKind  Kind       { get; set; }
        public string       Stereotype { get; set; } = string.Empty;
        /// <summary>이 요소가 속한 패키지. 항상 설정됨.</summary>
        public ModelPackage Package    { get; set; }

        // ── Struct (Class) ──────────────────────────────────────────────────
        public List<ModelField> Fields { get; } = new List<ModelField>();
        /// <summary>Generalization 관계로 찾은 부모 GUID (미해석). null이면 상속 없음.</summary>
        public string       ParentGuid     { get; set; }
        /// <summary>해석 완료된 부모 요소. null이면 상속 없음.</summary>
        public ModelElement ParentElement  { get; set; }

        // ── Enum ────────────────────────────────────────────────────────────
        public List<EnumLiteral> Literals { get; } = new List<EnumLiteral>();

        // ── DataType (typedef) ──────────────────────────────────────────────
        /// <summary>alias 대상 원시 타입 이름. null이면 미설정.</summary>
        public string       AliasRawTypeName     { get; set; }
        /// <summary>alias 대상 요소 GUID. null이면 원시 타입.</summary>
        public string       AliasTypeGuid        { get; set; }
        /// <summary>
        /// EA.Element.ClassifierID 값 (DataType 전용).
        /// t_attribute.Classifier 또는 EA.Element.ClassifierID 에서 가져온 int ID.
        /// Pass 2에서 _byElemId 로 AliasResolvedElement / AliasTypeGuid 로 해석됩니다.
        /// 0이면 미설정 (원시 타입).
        /// </summary>
        public int          DataTypeClassifierID { get; set; }
        /// <summary>해석 완료된 alias 대상 요소. null이면 원시 타입.</summary>
        public ModelElement AliasResolvedElement  { get; set; }

        // ── 주석 / DDS 어노테이션 ──────────────────────────────────────────
        /// <summary>EA Notes → IDL 블록 주석 (/** ... */).</summary>
        public string Notes { get; set; }
        /// <summary>DDS 어노테이션 목록. e.g. ["@key", "@topic(name=\"Foo\")"]</summary>
        public List<string> Annotations { get; } = new List<string>();

        // ── 공통 계산 프로퍼티 ───────────────────────────────────────────────

        /// <summary>IDL 모듈 경로 구성요소. e.g. ["UMAA","Common","Measurement"]</summary>
        public List<string> ModuleParts() => Package.PathParts();

        /// <summary>완전한 IDL 한정 이름. e.g. UMAA::Common::Measurement::Angle</summary>
        public string FullyQualifiedName =>
            string.Join("::", ModuleParts().Concat(new[] { Name }));

        /// <summary>출력 루트 기준 상대 IDL 파일 경로. e.g. UMAA/Common/Measurement/Angle.idl</summary>
        public string RelativeIdlPath =>
            Path.Combine(ModuleParts().Concat(new[] { Name + ".idl" }).ToArray());

        /// <summary>
        /// #include가 필요한 직접 의존 요소 (중복 제거).
        /// C# 7.3: local iterator function 미지원 → private 정적 헬퍼로 분리.
        /// </summary>
        public IEnumerable<ModelElement> DirectDependencies()
        {
            var seen = new HashSet<string>();

            foreach (var e in YieldIfNew(ParentElement, seen, this))
                yield return e;

            foreach (var field in Fields)
                foreach (var e in YieldIfNew(field.ResolvedType, seen, this))
                    yield return e;

            foreach (var e in YieldIfNew(AliasResolvedElement, seen, this))
                yield return e;
        }

        /// <summary>
        /// candidate가 null이 아니고, self와 다르며, 처음 등장하면 열거합니다.
        /// C# 8 local iterator function을 대체하는 private 정적 헬퍼입니다.
        /// </summary>
        private static IEnumerable<ModelElement> YieldIfNew(
            ModelElement candidate,
            HashSet<string> seen,
            ModelElement self)
        {
            if (candidate != null && candidate != self && seen.Add(candidate.Guid))
                yield return candidate;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  필드 (Struct 속성)
    // ─────────────────────────────────────────────────────────────────────────

    public class ModelField
    {
        public string       Name         { get; set; } = string.Empty;
        public string       RawTypeName  { get; set; } = string.Empty;  // EA 원본 타입 이름
        /// <summary>t_attribute.ID — t_attributetag 조인용.</summary>
        public int          AttrId       { get; set; }
        /// <summary>EA Notes → IDL 인라인 주석.</summary>
        public string       Notes        { get; set; }
        /// <summary>DDS 어노테이션. e.g. ["@key", "@optional"]</summary>
        public List<string> Annotations  { get; } = new List<string>();
        /// <summary>EA.Attribute.ClassifierID (int). 0이면 원시 타입.</summary>
        public int          ClassifierID { get; set; }
        /// <summary>해석 완료된 요소 타입. null이면 원시 타입.</summary>
        public ModelElement ResolvedType { get; set; }

        /// <summary>상한 다중성 문자열. null 또는 "1"이면 단순 필드.</summary>
        public string       UpperBound   { get; set; }
        /// <summary>하한 다중성 문자열.</summary>
        public string       LowerBound   { get; set; }

        /// <summary>다중성 상한이 '*' 또는 정수 2 이상이면 sequence.</summary>
        public bool IsSequence =>
            !string.IsNullOrEmpty(UpperBound) && UpperBound != "1";

        /// <summary>bounded sequence: 상한이 정수이면 해당 값, 아니면 null.</summary>
        public int? BoundedSize
        {
            get
            {
                int n;
                if (int.TryParse(UpperBound, out n) && n > 1)
                    return n;
                return null;
            }
        }

        public bool IsOptional =>
            LowerBound == "0" && UpperBound == "1";
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  열거형 리터럴
    // ─────────────────────────────────────────────────────────────────────────

    public class EnumLiteral
    {
        public string Name  { get; set; } = string.Empty;
        /// <summary>EA Default 값. null이면 미설정.</summary>
        public string Value { get; set; }
        /// <summary>EA Notes → IDL 인라인 주석.</summary>
        public string Notes { get; set; }
    }
}
