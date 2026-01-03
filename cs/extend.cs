%extend SGISGraphicBase2D {
    const char* GetTypeName() {
        return typeid(*$self).name();
    }
}

%extend SGISGraphicBase2D {
    const char* GetTypeName() {
        if (dynamic_cast<SGiSPolygon*>($self)) return "SGiSPolygon";
        if (dynamic_cast<SGISLineString*>($self)) return "SGISLineString";
        return "SGISGraphicBase2D";
    }
}

%inline %{
const char* GetGraphicTypeName(SGISGraphicBase2D* obj) {
    if (dynamic_cast<SGiSPolygon*>(obj)) return "SGiSPolygon";
    if (dynamic_cast<SGISLineString*>(obj)) return "SGISLineString";
    return "SGISGraphicBase2D";
}
%}

%inline %{
const char* GetObjectTypeName(SGISGraphicBase2D* obj) {
    if (!obj) return nullptr;

    return typeid(*obj).name();

}
%}
///
%module YourModule

// std::vector 래핑
%include "std_vector.i"

namespace std {
    %template(SGISGraphicObjectList) vector<SGISGraphicBase2D*>;
}

// typemap으로 getitem 커스터마이징 (선택사항)
%typemap(csout, excode=SWIGEXCODE) SGISGraphicBase2D* {
    System.IntPtr cPtr = $imcall;$excode
    return (cPtr == System.IntPtr.Zero) ? null : 
           GraphicObjectFactory.CreateFromPtr(cPtr, false);
}


public static class GraphicObjectFactory
{
    // 타입 이름에서 C# 타입으로 매핑
    private static Dictionary<string, Type> typeMap = new Dictionary<string, Type>()
    {
        // C++ 맹글링된 이름 또는 실제 클래스 이름을 키로 사용
        { "SGISGraphicBase2D", typeof(SGISGraphicBase2D) },
        { "SGISGraphicCircle", typeof(SGISGraphicCircle) },
        { "SGISGraphicRectangle", typeof(SGISGraphicRectangle) },
        // ... 다른 파생 클래스들
    };

    [DllImport("YourNativeModule")]
    private static extern string GetObjectTypeName(IntPtr obj);

    public static SGISGraphicBase2D CreateFromPtr(IntPtr cPtr, bool cMemoryOwn)
    {
        if (cPtr == IntPtr.Zero)
            return null;

        // 1. 네이티브에서 실제 타입 이름 가져오기
        string typeName = GetObjectTypeName(cPtr);
        
        // 2. C++ 맹글링된 이름 파싱 (필요시)
        typeName = ParseMangledName(typeName);

        // 3. 매핑된 C# 타입 찾기
        if (!typeMap.TryGetValue(typeName, out Type targetType))
        {
            // 타입을 찾지 못하면 기본 클래스 사용
            targetType = typeof(SGISGraphicBase2D);
        }

        // 4. 리플렉션으로 적절한 생성자 호출
        ConstructorInfo constructor = targetType.GetConstructor(
            BindingFlags.NonPublic | BindingFlags.Instance,
            null,
            new Type[] { typeof(IntPtr), typeof(bool) },
            null
        );

        if (constructor != null)
        {
            return (SGISGraphicBase2D)constructor.Invoke(new object[] { cPtr, cMemoryOwn });
        }

        // 폴백: 기본 클래스로 생성
        return new SGISGraphicBase2D(cPtr, cMemoryOwn);
    }

    private static string ParseMangledName(string mangledName)
    {
        // C++ 컴파일러에 따라 맹글링 규칙이 다름
        // MSVC: ?name@@...
        // GCC/Clang: _ZN...
        
        // 예시: 간단한 파싱
        if (mangledName.Contains("Circle"))
            return "SGISGraphicCircle";
        if (mangledName.Contains("Rectangle"))
            return "SGISGraphicRectangle";
            
        return mangledName;
    }
}

// C++ 기본 클래스
class SGISGraphicBase2D {
public:
    virtual const char* GetTypeName() const { return "SGISGraphicBase2D"; }
};

class SGISGraphicCircle : public SGISGraphicBase2D {
public:
    const char* GetTypeName() const override { return "SGISGraphicCircle"; }
};
