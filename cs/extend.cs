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
