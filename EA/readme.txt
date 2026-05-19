EARepository          (DB → 메모리 모델 조립)
    └── Database      (SQLite RAII 래퍼)
    └── Statement     (쿼리 / 바인딩)

EAModel               (순수 데이터: Package, Object, Attribute, Operation ...)

IDLGenerator          (모델 → IDL 텍스트 변환)
    └── writeModule / writeInterface / writeStruct / writeEnum
    └── mapType()     (EA 타입 → IDL 타입 매핑)

/////////
t_package      ─── 패키지 (모듈)
    │
t_object       ─── 클래스 / 인터페이스 / 열거형
    ├── t_attribute       ─── 필드 / 속성
    ├── t_operation       ─── 메서드
    │       └── t_operationparams  ─── 파라미터
    └── t_connector       ─── 상속 / 연관 관계
