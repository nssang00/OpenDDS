%module YourModuleName

%include <std_shared_ptr.i>
%include <std_vector.i>
%include <std_string.i>

// shared_ptr 선언
%shared_ptr(SGISGraphicBase2D)
%shared_ptr(SGISPolygon)
// 다른 파생 클래스들도 추가
// %shared_ptr(SGISCircle)
// %shared_ptr(SGISRectangle)

// C#용 typemap - vector에서 꺼낼 때 올바른 타입으로 반환
%typemap(ctype)  std::shared_ptr<SGISGraphicBase2D> "void *"
%typemap(imtype) std::shared_ptr<SGISGraphicBase2D> "System.IntPtr"
%typemap(cstype) std::shared_ptr<SGISGraphicBase2D> "SGISGraphicBase2D"

%typemap(out) std::shared_ptr<SGISGraphicBase2D> %{
    SGISGraphicBase2D* raw_ptr = $1.get();
    
    // 다형성 타입 체크 - 가장 구체적인 타입부터 확인
    if (dynamic_cast<SGISPolygon*>(raw_ptr)) {
        std::shared_ptr<SGISPolygon> *smartresult = new std::shared_ptr<SGISPolygon>(
            std::static_pointer_cast<SGISPolygon>($1)
        );
        $result = (void *)smartresult;
    } 
    // 다른 파생 클래스들 추가
    // else if (dynamic_cast<SGISCircle*>(raw_ptr)) {
    //     std::shared_ptr<SGISCircle> *smartresult = new std::shared_ptr<SGISCircle>(
    //         std::static_pointer_cast<SGISCircle>($1)
    //     );
    //     $result = (void *)smartresult;
    // }
    else {
        std::shared_ptr<SGISGraphicBase2D> *smartresult = new std::shared_ptr<SGISGraphicBase2D>($1);
        $result = (void *)smartresult;
    }
%}

%typemap(csout, excode=SWIGEXCODE) std::shared_ptr<SGISGraphicBase2D> {
    System.IntPtr cPtr = $imcall;
    SGISGraphicBase2D ret = (cPtr == System.IntPtr.Zero) ? null : new SGISGraphicBase2D(cPtr, $owner);$excode
    
    // 런타임에 실제 타입 확인하여 적절한 래퍼 반환
    if (ret != null) {
        string typeName = ret.GetTypeName();
        if (typeName == "SGISPolygon") {
            return new SGISPolygon(cPtr, $owner);
        }
        // 다른 타입들 추가
        // else if (typeName == "SGISCircle") {
        //     return new SGISCircle(cPtr, $owner);
        // }
    }
    
    return ret;
}

// vector 템플릿 인스턴스화
%template(SGISGraphicObjectList) std::vector<std::shared_ptr<SGISGraphicBase2D>>;

// C++ 헬퍼 함수 추가 - 타입 이름 반환
%extend SGISGraphicBase2D {
    virtual std::string GetTypeName() const {
        return "SGISGraphicBase2D";
    }
}

%extend SGISPolygon {
    virtual std::string GetTypeName() const override {
        return "SGISPolygon";
    }
}

// 안전한 다운캐스팅 헬퍼 함수들
%inline %{
    std::shared_ptr<SGISPolygon> CastToPolygon(std::shared_ptr<SGISGraphicBase2D> base) {
        return std::dynamic_pointer_cast<SGISPolygon>(base);
    }
    
    // 다른 타입들을 위한 캐스팅 함수
    // std::shared_ptr<SGISCircle> CastToCircle(std::shared_ptr<SGISGraphicBase2D> base) {
    //     return std::dynamic_pointer_cast<SGISCircle>(base);
    // }
%}

// 헤더 파일 포함
%include "SGISGraphicBase2D.h"
%include "SGISPolygon.h"
// %include "SGISCircle.h"

////////////
/////////////
using System;

class Program
{
    static void Main()
    {
        SGISGraphicObjectList guidObjectList = new SGISGraphicObjectList();
        
        // 다양한 타입 추가
        guidObjectList.Add(new SGISPolygon());
        guidObjectList.Add(new SGISGraphicBase2D());
        
        // 방법 1: GetTypeName()으로 타입 확인 (가장 안정적)
        for (int i = 0; i < guidObjectList.Count; i++)
        {
            var obj = guidObjectList[i];
            string typeName = obj.GetTypeName();
            
            Console.WriteLine($"객체 {i}: {typeName}");
            
            if (typeName == "SGISPolygon")
            {
                // C#의 is/as는 작동하지 않을 수 있으므로 헬퍼 사용
                var polygon = YourModuleName.CastToPolygon(obj);
                if (polygon != null)
                {
                    Console.WriteLine("  -> SGISPolygon으로 캐스팅 성공!");
                    // polygon의 메서드 사용 가능
                }
            }
        }
        
        // 방법 2: C# is 패턴 (typemap이 올바르게 설정되면 작동)
        var obj2 = guidObjectList[0];
        if (obj2 is SGISPolygon poly)
        {
            Console.WriteLine("직접 캐스팅 성공!");
        }
        
        // 방법 3: 헬퍼 함수 사용 (가장 안전)
        var polygon2 = YourModuleName.CastToPolygon(guidObjectList[0]);
        if (polygon2 != null)
        {
            Console.WriteLine("헬퍼로 캐스팅 성공!");
        }
    }
}
////////////
////////////
%define REGISTER_GRAPHIC_TYPE(TYPE)
    %shared_ptr(TYPE)
    %extend TYPE {
        virtual std::string GetTypeName() const override {
            return #TYPE;
        }
    }
    %inline %{
        std::shared_ptr<TYPE> CastTo##TYPE(std::shared_ptr<SGISGraphicBase2D> base) {
            return std::dynamic_pointer_cast<TYPE>(base);
        }
    %}
%enddef

REGISTER_GRAPHIC_TYPE(SGISPolygon)
REGISTER_GRAPHIC_TYPE(SGISCircle)
REGISTER_GRAPHIC_TYPE(SGISRectangle)
