%module YourModuleName

%include <std_shared_ptr.i>
%include <std_vector.i>
%include <std_string.i>

%shared_ptr(SGISGraphicBase2D)
%shared_ptr(SGISPolygon)

%template(SGISGraphicObjectList) std::vector<std::shared_ptr<SGISGraphicBase2D>>;

// 다형성 캐스팅을 위해 typemap 추가 (필수!)
%typemap(out) std::shared_ptr<SGISGraphicBase2D> {
    if ($1) {
        SGISGraphicBase2D* raw = $1.get();
        if (dynamic_cast<SGISPolygon*>(raw)) {
            $result = SWIG_NewPointerObj(SWIG_as_voidptr($1.get()), SWIGTYPE_p_SGISPolygon, $owner);
        } else {
            $result = SWIG_NewPointerObj(SWIG_as_voidptr($1.get()), SWIGTYPE_p_SGISGraphicBase2D, $owner);
        }
        // 필요하면 다른 자식 클래스들도 추가
    } else {
        $result = SWIG_NewPointerObj(NULL, SWIGTYPE_p_SGISGraphicBase2D, 0);
    }
}

// 헤더 포함
%include "SGISGraphicBase2D.h"
%include "SGISPolygon.h"
//////////
SGISGraphicObjectList guidObjectList = new SGISGraphicObjectList();

// 추가
guidObjectList.Add(new SGISPolygon());

// 꺼내기 & 타입 확인
var obj = guidObjectList[0];

// 방법 1: is / as (가장 일반적)
if (obj is SGISPolygon poly)
{
    Console.WriteLine("SGISPolygon입니다!");
    // poly 사용 가능
}
else
{
    Console.WriteLine("SGISPolygon이 아닙니다.");
}

// 방법 2: GetType()으로 정확한 타입 이름 확인
Console.WriteLine($"실제 타입: {obj.GetType().FullName}");  // "SGISPolygon" 출력

// 방법 3: C++에서 제공한 GetTypeName() 사용 (가장 안정적)
string typeName = obj.GetTypeName();
Console.WriteLine($"타입 이름: {typeName}");  // "SGISPolygon" 또는 "SGISGraphicBase2D" 등
