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
