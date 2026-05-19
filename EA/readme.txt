EARepository          (DB → 메모리 모델 조립)
    └── Database      (SQLite RAII 래퍼)
    └── Statement     (쿼리 / 바인딩)

EAModel               (순수 데이터: Package, Object, Attribute, Operation ...)

IDLGenerator          (모델 → IDL 텍스트 변환)
    └── writeModule / writeInterface / writeStruct / writeEnum
    └── mapType()     (EA 타입 → IDL 타입 매핑)
