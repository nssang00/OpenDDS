%module YourModuleName

%include <std_shared_ptr.i>
%include <std_vector.i>
%include <std_string.i>

%shared_ptr(SGISGraphicBase2D)
%shared_ptr(SGISPolygon)
// 필요 시 계속 추가
// %shared_ptr(SGISCircle)
// %shared_ptr(SGISRectangle)

/* =========================
 * STL 컨테이너
 * ========================= */
%template(SGISGraphicObjectList)
std::vector<std::shared_ptr<SGISGraphicBase2D>>;

/* =========================
 * C++ RTTI 기반 타입 식별 (디버그/확인용)
 * ========================= */
%extend SGISGraphicBase2D {
    virtual std::string GetTypeName() const {
        return "SGISGraphicBase2D";
    }
}

%extend SGISPolygon {
    std::string GetTypeName() const override {
        return "SGISPolygon";
    }
}

/* =========================
 * 안전한 다운캐스팅 헬퍼 (정석)
 * ========================= */
%inline %{
    std::shared_ptr<SGISPolygon>
    AsPolygon(const std::shared_ptr<SGISGraphicBase2D>& base) {
        return std::dynamic_pointer_cast<SGISPolygon>(base);
    }

    // 필요하면 계속 추가
    // std::shared_ptr<SGISCircle>
    // AsCircle(const std::shared_ptr<SGISGraphicBase2D>& base) {
    //     return std::dynamic_pointer_cast<SGISCircle>(base);
    // }
%}

/* =========================
 * 헤더 포함
 * ========================= */
%include "SGISGraphicBase2D.h"
%include "SGISPolygon.h"
// %include "SGISCircle.h"


////////////
using System;

class Program
{
    static void Main()
    {
        var list = new SGISGraphicObjectList();

        list.Add(new SGISPolygon());
        list.Add(new SGISGraphicBase2D());

        for (int i = 0; i < list.Count; i++)
        {
            var obj = list[i];

            Console.WriteLine($"[{i}] TypeName = {obj.GetTypeName()}");

            // ❌ is / as 사용하지 않음 (SWIG 철학상 보장 안 됨)
            // if (obj is SGISPolygon) ...

            // ✅ 정석: C++ 헬퍼 사용
            var poly = YourModuleName.AsPolygon(obj);
            if (poly != null)
            {
                Console.WriteLine("  -> SGISPolygon으로 안전하게 캐스팅됨");
                // poly 메서드 사용
            }
        }
    }
}
