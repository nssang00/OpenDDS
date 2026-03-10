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
}
