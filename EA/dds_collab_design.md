# DDS 협업 DB 설계 문서

## 1. 프로젝트 개요

### 목적
```
국과연 Sparx EA 모델 → 협업 DB → IDL 생성 + 문서 생성
대상: RTI DDS / Fast DDS
```

### 개발 환경
```
언어:      C++11
IDE:       Visual Studio 2019
DB:        SQLite (1차) → PostgreSQL (협업 서버)
UI:        CEF 기반 (C++ + JS)
문서생성:  Markdown 템플릿 기반
```

### 외부 라이브러리
```
sqlite3        단일 파일 amalgamation (sqlite3.h + sqlite3.c)
nlohmann/json  헤더 온리 JSON 라이브러리 (json.hpp)
```

---

## 2. 레이어 구조

### 레이어 이름 정의
```
EA Model    ← Sparx EA QEA 파일 (원본)
Repository  ← 협업 DB (SQLite or PostgreSQL)
DDS Model   ← C++ 객체 (메모리)
```

### 전체 흐름
```
EA Model (QEA 파일)
    ↓ EAReader / EAConverter
Repository (SQLite or PostgreSQL)
    ↓ SQLiteRepository / PostgreSQLRepository
DDS Model (C++ 객체)
    ├── toAny()            → CEF 통신용 (std::any)
    ├── toJson()           → 테스트/디버깅용 (JSON 문자열)
    ├── generateIDL()      → RTI/Fast DDS IDL 파일 생성
    └── generateMarkdown() → Markdown 템플릿 기반 문서 생성
```

### 레이어별 의존 관계
```
ea/          → third_party/sqlite3 (QEA 읽기)
repository/  → third_party/sqlite3
dds/         → repository/
generator/   → dds/
main.cpp     → 전체
```

---

## 3. 프로젝트 폴더 구조

```
DDSCollab/
├── DDSCollab.sln
│
├── src/
│   ├── ea/                          ← EA Model 레이어
│   │   ├── EAModels.h               ← EA 구조체 정의
│   │   ├── EAReader.h / .cpp        ← QEA 파일 읽기
│   │   └── EAConverter.h / .cpp     ← EA → Repository 변환
│   │
│   ├── repository/                  ← Repository 레이어
│   │   ├── IRepository.h            ← 인터페이스
│   │   ├── RepositoryModels.h       ← DB 구조체
│   │   └── SQLiteRepository.h / .cpp ← SQLite 구현
│   │
│   ├── dds/                         ← DDS Model 레이어
│   │   ├── DDSModels.h              ← DDS 클래스 전체 정의
│   │   ├── DDSProject.h / .cpp
│   │   ├── DDSPackage.h / .cpp
│   │   ├── DDSType.h / .cpp
│   │   ├── DDSMember.h / .cpp
│   │   ├── DDSDomain.h / .cpp
│   │   ├── DDSTopic.h / .cpp
│   │   ├── DDSQosProfile.h / .cpp
│   │   └── DDSParticipant.h / .cpp
│   │
│   ├── generator/                   ← 생성 레이어
│   │   ├── IDLGenerator.h / .cpp    ← generateIDL()
│   │   └── MarkdownGenerator.h / .cpp ← generateMarkdown()
│   │
│   └── main.cpp
│
├── third_party/                     ← 외부 라이브러리
│   ├── sqlite3/
│   │   ├── sqlite3.h
│   │   └── sqlite3.c
│   └── nlohmann/
│       └── json.hpp
│
├── templates/                       ← Markdown 템플릿
│   └── default.md
│
└── test/
    └── test_main.cpp
```

---

## 4. Repository 스키마 (15개 테이블)

### 설계 원칙
```
기반: OMG DDS JSON 스펙
id:   UUID (TEXT) - SQLite/PostgreSQL 호환
날짜: created_at / updated_at (TEXT, datetime('now'))
EA 원본 추적: ea_guid, ea_stereotype, source 컬럼
source: 'ea' (EA에서 변환) | 'manual' (직접 추가)
```

### ea_guid 보존 테이블
```
ea_guid 있음 (EA에서 가져오는 테이블)
  packages / types / type_members
  domains / topics / participants
  publishers / subscribers / writers / readers

ea_guid 없음 (협업 DB에서 직접 생성)
  projects / qos_profiles / qos_policies
  register_types / audit_log
```

---

### 테이블 1: projects
```sql
id            TEXT PRIMARY KEY
name          TEXT NOT NULL
description   TEXT
version       TEXT
created_at    TEXT
updated_at    TEXT
```

---

### 테이블 2: packages
```sql
id            TEXT PRIMARY KEY
project_id    TEXT NOT NULL     -- FK → projects.id
parent_id     TEXT              -- FK → packages.id (자기참조, NULL이면 최상위)
name          TEXT NOT NULL
kind          TEXT              -- 'module'|'type_library'|'domain_library'|'folder'
description   TEXT
ordinal       INTEGER           -- 정렬 순서
ea_guid       TEXT              -- EA 원본 추적
ea_stereotype TEXT              -- EA 원본 보존
source        TEXT              -- 'ea'|'manual'
created_at    TEXT
updated_at    TEXT
```
※ qualified_name은 parent_id 재귀로 조합 ("::" 구분자)

---

### 테이블 3: types
```sql
id             TEXT PRIMARY KEY
project_id     TEXT NOT NULL    -- FK → projects.id
package_id     TEXT             -- FK → packages.id
name           TEXT NOT NULL
kind           TEXT             -- 'struct'|'enum'|'union'|'typedef'
base_type_id   TEXT             -- FK → types.id (상속, Generalization)
extensibility  TEXT             -- 'final'|'appendable'|'mutable' (기본값: 'appendable')
description    TEXT
annotations    TEXT             -- JSON (커스텀 태그)
ea_guid        TEXT
ea_object_type TEXT             -- 'Class'|'Enumeration'|'DataType'|'Interface' 원본 보존
ea_stereotype  TEXT             -- 원본 보존
source         TEXT             -- 'ea'|'manual'
created_at     TEXT
updated_at     TEXT
```

#### EA → types.kind 변환 규칙
| Object_Type | Stereotype | kind |
|---|---|---|
| Class | struct / idlStruct | struct |
| Class | enumeration | enum |
| Class | union | union |
| Class | typedef / alias | typedef |
| Class | NULL / '' | struct (기본값) |
| Enumeration | (모든 경우) | enum |
| DataType | (모든 경우) | typedef |
| Interface | (모든 경우) | struct |

※ 변환 불확실한 경우 kind=NULL, 사용자가 Web UI에서 지정

---

### 테이블 4: type_members
```sql
id               TEXT PRIMARY KEY
type_id          TEXT NOT NULL    -- FK → types.id
name             TEXT NOT NULL
ordinal          INTEGER          -- 선언 순서 (t_attribute.Pos)
member_kind      TEXT             -- 'field'|'literal'|'case'|'discriminator'

-- 타입 참조 (둘 중 하나)
primitive_type   TEXT             -- 'boolean'|'int8'|'uint8'|'int16'|'uint16'
                                  -- 'int32'|'uint32'|'int64'|'uint64'
                                  -- 'float32'|'float64'|'float128'
                                  -- 'char'|'wchar'|'string'|'wstring'|'octet'
ref_type_id      TEXT             -- FK → types.id (복합 타입 참조)

-- EA 원본 보존
ea_type_name     TEXT             -- t_attribute.Type 원본 문자열
lower_bound      TEXT             -- t_attribute.LowerBound 원본
upper_bound      TEXT             -- t_attribute.UpperBound 원본

-- 컬렉션 (LowerBound/UpperBound 파생)
is_sequence      INTEGER DEFAULT 0
sequence_bound   INTEGER          -- NULL이면 unbounded
is_array         INTEGER DEFAULT 0
array_dimensions TEXT             -- JSON "[3,4]"
string_bound     INTEGER          -- t_attribute.Length

-- 자주 쓰는 annotation (컬럼으로)
is_key           INTEGER DEFAULT 0
is_optional      INTEGER DEFAULT 0

-- 나머지 annotation (JSON으로)
annotations      TEXT             -- '{"id":5,"range":"0..100","unit":"m/s"}'

-- enum 전용
enum_value       INTEGER

-- union 전용
case_labels      TEXT             -- JSON '["0","1"]'|'["default"]'

default_value    TEXT
description      TEXT
ea_guid          TEXT
ea_stereotype    TEXT             -- 'idlField'|'key'|'foreignKey' 원본 보존
source           TEXT             -- 'ea'|'manual'
created_at       TEXT
updated_at       TEXT
```

#### LowerBound/UpperBound → 컬렉션 변환 규칙
```
UpperBound = '0' or '*'              → is_sequence=1, sequence_bound=NULL
LowerBound = '0', UpperBound = '1'  → is_optional=1
LowerBound = UpperBound = N (N>1)   → is_array=1, array_dimensions=[N]
LowerBound < UpperBound             → is_sequence=1, sequence_bound=UpperBound
LowerBound = UpperBound = '1'       → 단일 멤버 (기본)
```

#### is_key 판별 규칙
```
t_attribute.Stereotype = 'key'
OR t_attributetag.Property = 'isDCPSKey' AND VALUE = 'true'
→ is_key = 1
```

#### EA primitive 타입 변환
```
'long', 'int'          → int32
'short'                → int16
'unsigned long'        → uint32
'unsigned short'       → uint16
'long long'            → int64
'unsigned long long'   → uint64
'float'                → float32
'double'               → float64
'long double'          → float128
'bool', 'boolean'      → boolean
'char*', 'string'      → string
그 외                  → ref_type_id (types.name 매칭)
```

---

### 테이블 5: domains
```sql
id            TEXT PRIMARY KEY
project_id    TEXT NOT NULL    -- FK → projects.id
package_id    TEXT             -- FK → packages.id
name          TEXT NOT NULL
domain_id     INTEGER          -- DDS Domain ID (0~232)
description   TEXT
ea_guid       TEXT
ea_stereotype TEXT
source        TEXT             -- 'ea'|'manual'
created_at    TEXT
updated_at    TEXT
```

---

### 테이블 6: register_types
```sql
id            TEXT PRIMARY KEY
domain_id     TEXT NOT NULL    -- FK → domains.id
type_id       TEXT NOT NULL    -- FK → types.id
register_name TEXT             -- 등록 이름 (NULL이면 types.name 사용)
description   TEXT
created_at    TEXT
updated_at    TEXT
```
※ 같은 타입을 같은 domain에 다른 이름으로 여러 번 등록 가능

---

### 테이블 7: topics
```sql
id               TEXT PRIMARY KEY
project_id       TEXT NOT NULL   -- FK → projects.id
package_id       TEXT            -- FK → packages.id
domain_id        TEXT            -- FK → domains.id (NULL 허용)
name             TEXT NOT NULL
register_type_id TEXT            -- FK → register_types.id
qos_profile_id   TEXT            -- FK → qos_profiles.id
description      TEXT
ea_guid          TEXT
ea_stereotype    TEXT
source           TEXT            -- 'ea'|'manual'
created_at       TEXT
updated_at       TEXT
```
※ topics.type_id 제거 → register_types.type_id로 조회

#### topic → type 연결 방식 (QEA)
```
t_objectproperties.Property = 'type'
Value = ea_guid → types.ea_guid 매칭
→ register_types 경유하여 topics.register_type_id 설정
```

---

### 테이블 8: qos_profiles
```sql
id              TEXT PRIMARY KEY
project_id      TEXT NOT NULL   -- FK → projects.id
name            TEXT NOT NULL
base_profile_id TEXT            -- FK → qos_profiles.id (상속)
description     TEXT
created_at      TEXT
updated_at      TEXT
```

---

### 테이블 9: qos_policies
```sql
id            TEXT PRIMARY KEY
profile_id    TEXT NOT NULL    -- FK → qos_profiles.id
entity_kind   TEXT             -- 'topic'|'writer'|'reader'|'participant'
policy_name   TEXT             -- 'DURABILITY'|'RELIABILITY'|'DEADLINE'
                               -- 'HISTORY'|'LIVELINESS'|'OWNERSHIP'
                               -- 'RESOURCE_LIMITS'|'LIFESPAN' 등
policy_value  TEXT             -- JSON '{"kind":"RELIABLE","max_blocking_time":"100ms"}'
created_at    TEXT
updated_at    TEXT
```

#### policy_value JSON 예시
```json
DURABILITY:      {"kind":"TRANSIENT_LOCAL"}
RELIABILITY:     {"kind":"RELIABLE","max_blocking_time":"100ms"}
HISTORY:         {"kind":"KEEP_LAST","depth":10}
DEADLINE:        {"period":"500ms"}
LIVELINESS:      {"kind":"AUTOMATIC","lease_duration":"1s"}
RESOURCE_LIMITS: {"max_samples":100,"max_instances":10}
```

---

### 테이블 10: participants
```sql
id             TEXT PRIMARY KEY
project_id     TEXT NOT NULL   -- FK → projects.id
package_id     TEXT            -- FK → packages.id
domain_id      TEXT            -- FK → domains.id
name           TEXT NOT NULL
qos_profile_id TEXT            -- FK → qos_profiles.id
description    TEXT
ea_guid        TEXT
ea_stereotype  TEXT
source         TEXT            -- 'ea'|'manual'
created_at     TEXT
updated_at     TEXT
```

#### domain → participant 연결 방식 (QEA)
```
t_objectproperties.Property = 'domain'
Value = ea_guid → domains.ea_guid 매칭
→ participants.domain_id 설정
```

---

### 테이블 11: publishers
```sql
id             TEXT PRIMARY KEY
participant_id TEXT NOT NULL   -- FK → participants.id
name           TEXT NOT NULL
qos_profile_id TEXT            -- FK → qos_profiles.id
description    TEXT
ea_guid        TEXT
ea_stereotype  TEXT
source         TEXT            -- 'ea'|'manual'
created_at     TEXT
updated_at     TEXT
```

---

### 테이블 12: subscribers
```sql
id             TEXT PRIMARY KEY
participant_id TEXT NOT NULL   -- FK → participants.id
name           TEXT NOT NULL
qos_profile_id TEXT            -- FK → qos_profiles.id
description    TEXT
ea_guid        TEXT
ea_stereotype  TEXT
source         TEXT            -- 'ea'|'manual'
created_at     TEXT
updated_at     TEXT
```

---

### 테이블 13: writers
```sql
id             TEXT PRIMARY KEY
publisher_id   TEXT NOT NULL   -- FK → publishers.id
topic_id       TEXT            -- FK → topics.id
name           TEXT NOT NULL
qos_profile_id TEXT            -- FK → qos_profiles.id
description    TEXT
ea_guid        TEXT
ea_stereotype  TEXT
source         TEXT            -- 'ea'|'manual'
created_at     TEXT
updated_at     TEXT
```

---

### 테이블 14: readers
```sql
id             TEXT PRIMARY KEY
subscriber_id  TEXT NOT NULL   -- FK → subscribers.id
topic_id       TEXT            -- FK → topics.id
name           TEXT NOT NULL
qos_profile_id TEXT            -- FK → qos_profiles.id
description    TEXT
ea_guid        TEXT
ea_stereotype  TEXT
source         TEXT            -- 'ea'|'manual'
created_at     TEXT
updated_at     TEXT
```

---

### 테이블 15: audit_log
```sql
id          TEXT PRIMARY KEY
project_id  TEXT             -- FK → projects.id
target_kind TEXT             -- 'type'|'type_member'|'package'|'topic'
                             -- 'domain'|'register_type'|'qos_profile'
                             -- 'participant'|'publisher'|'subscriber'
                             -- 'writer'|'reader'
target_id   TEXT
action      TEXT             -- 'create'|'update'|'delete'|'ea_sync'
changed_by  TEXT             -- 사용자명 or 'ea_import'
changed_at  TEXT
diff        TEXT             -- JSON '{"before":{...},"after":{...}}'
```

---

## 5. EA → Repository 변환

### EA 테이블 사용 여부
| EA 테이블 | 사용 여부 | 비고 |
|---|---|---|
| t_package | ✅ 사용 | 필요한 package만 선택적으로 |
| t_object | ✅ 사용 | Object_Type 필터 후 |
| t_attribute | ✅ 사용 | DDS 관련 object에 속한 것만 |
| t_attributetag | ✅ 사용 | @key, @optional 등 |
| t_connector | ✅ 사용 | Connector_Type 필터 후 |
| t_objectproperties | ✅ 사용 | topic→type, participant→domain 연결 |
| t_taggedvalue | ⚠️ 부분 | extensibility 등 일부만 |
| t_xref | ❌ 무시 | 불필요 |
| t_connectortag | ❌ 무시 | 불필요 |

---

### 변환 순서

#### Step 1. DDS 대상 t_object 식별
```sql
SELECT Object_ID, Name, Object_Type, Stereotype, Package_ID, Note, ea_guid
FROM t_object
WHERE Object_Type IN ('Class', 'Interface', 'Enumeration', 'DataType')
```

#### Step 2. 필요한 t_package 재귀 추적
```
Step 1 결과의 Package_ID 수집
→ 상위 Parent_ID 재귀 추적
→ 필요한 package만 packages INSERT
→ qualified_name: 루트부터 "::"로 연결
```

#### Step 3. t_object → 테이블 분류
```
Object_Type = 'Part'
  Stereotype = 'domain'            → domains
  Stereotype = 'topic'             → topics (type 연결은 Step 5)
  Stereotype = 'publisher'         → publishers
  Stereotype = 'subscriber'        → subscribers
  Stereotype = 'qosProperty'       → qos_policies

Object_Type = 'Component'
  Stereotype = 'domainParticipant' → participants
  Stereotype = 'ddsAppTarget'      → 무시

Object_Type = 'Port'
  Stereotype = 'dataReader'        → readers
  Stereotype = 'dataWriter'        → writers
```

#### Step 4. t_attribute → type_members
```sql
SELECT a.ID, a.Object_ID, a.Name, a.Type, a.Stereotype,
       a.LowerBound, a.UpperBound, a.'Default', a.Classifier,
       a.Notes, a.Pos, a.ea_guid
FROM t_attribute a
WHERE a.Object_ID IN (-- Step 1 결과 Object_ID 목록)
ORDER BY a.Object_ID, a.Pos
```

```
ref_type_id 연결:
  t_attribute.Classifier (Object_ID) → types.ea_guid 매칭 (우선)
  Classifier = 0 or NULL → t_attribute.Type 문자열로 types.name 매칭
```

#### Step 5. t_objectproperties → 연결 처리
```
Property = 'type'
  Value(ea_guid) → types.ea_guid 매칭
  → register_types INSERT
  → topics.register_type_id UPDATE

Property = 'domain'
  Value(ea_guid) → domains.ea_guid 매칭
  → participants.domain_id UPDATE

Property = 'typedef' → true
  → types.kind = 'typedef' 판별

Property = 'typeSynonyms'
  → types alias 원본 타입명
```

#### Step 6. t_connector → 관계 처리
```
Connector_Type = 'Generalization'
  Start_Object_ID (자식) → End_Object_ID (부모)
  → types.base_type_id UPDATE

Connector_Type = 'Association' / 'Aggregation'
  → type_members.ref_type_id

Connector_Type = 'Dependency'
  SubType = 'use' OR Stereotype = 'use'
  → type_members.ref_type_id
  그 외 → 무시

Realization / Connector / NoteLink → 무시
```

#### Step 7. t_attributetag → type_members 업데이트
```
Property = 'isDCPSKey', VALUE = 'true'  → is_key = 1
Property = 'isDCPSKey', VALUE = 'false' → is_key = 0
Property = 'isOptional', VALUE = 'true' → is_optional = 1
그 외 → annotations JSON에 추가
```

#### Step 8. audit_log 기록
```
action = 'ea_sync'
changed_by = 'ea_import'
diff = {"source":"파일명.qea", "types":N, "members":N}
```

---

### EA 재동기화 규칙
```
ea_guid로 기존 row 검색
  있음 → source='ea'이면 UPDATE
         source='manual'이면 충돌 감지 → audit_log 기록
  없음 → INSERT (신규 요소)

EA에는 없고 협업 DB에만 있는 ea_guid
  → EA에서 삭제된 것 → 사용자 확인 후 DELETE
```

---

## 6. DDS Model (C++ 클래스)

### 클래스 구조
```cpp
DDSProject
  └── vector<DDSPackage>
        └── vector<DDSType>
              └── vector<DDSMember>
        └── vector<DDSDomain>
              └── vector<DDSRegisterType>
              └── vector<DDSTopic>
        └── vector<DDSQosProfile>
              └── vector<DDSQosPolicy>
        └── vector<DDSParticipant>
              └── vector<DDSPublisher>
                    └── vector<DDSWriter>
              └── vector<DDSSubscriber>
                    └── vector<DDSReader>
```

### 메서드 네이밍 규칙
```
내부 변환 (to 접두사)
  toAny()   → std::any 변환 (CEF 통신용)
  toJson()  → JSON 문자열 (테스트/디버깅용)

파일 생성 (generate 접두사)
  generateIDL()      → RTI/Fast DDS IDL 파일
  generateMarkdown() → Markdown 템플릿 기반 문서
```

### Repository 인터페이스
```cpp
class IRepository {
public:
    virtual void saveProject(const DDSProject&) = 0;
    virtual void savePackage(const DDSPackage&) = 0;
    virtual void saveType(const DDSType&) = 0;
    virtual void saveMember(const DDSMember&) = 0;
    virtual void saveDomain(const DDSDomain&) = 0;
    virtual void saveRegisterType(const DDSRegisterType&) = 0;
    virtual void saveTopic(const DDSTopic&) = 0;
    virtual void saveQosProfile(const DDSQosProfile&) = 0;
    virtual void saveQosPolicy(const DDSQosPolicy&) = 0;
    virtual void saveParticipant(const DDSParticipant&) = 0;
    virtual void savePublisher(const DDSPublisher&) = 0;
    virtual void saveSubscriber(const DDSSubscriber&) = 0;
    virtual void saveWriter(const DDSWriter&) = 0;
    virtual void saveReader(const DDSReader&) = 0;

    virtual DDSProject loadProject(const std::string& id) = 0;
    virtual std::vector<DDSType> loadTypes(const std::string& projectId) = 0;
    virtual std::vector<DDSMember> loadMembers(const std::string& typeId) = 0;
    // ...
};
```

---

## 7. 구현 순서

```
1단계: Repository
  SQLite DDL 작성
  IRepository 인터페이스
  SQLiteRepository 구현

2단계: EA Model → Repository
  EAModels.h 구조체 정의
  EAReader.cpp (QEA 읽기)
  EAConverter.cpp (변환 로직)

3단계: DDS Model
  DDSModels.h 클래스 정의
  Repository → DDS Model 로드
  toJson() / toAny() 구현

4단계: IDL 생성
  IDLGenerator.cpp
  generateIDL() 구현
  RTI/Fast DDS IDL 검증

5단계: 문서 생성
  MarkdownGenerator.cpp
  generateMarkdown() 구현
  Markdown 템플릿 설계
```

---

## 8. 참고: OMG DDS JSON 스펙

### Building Block 구조
```
Building Block Types        → types, type_members
Building Block QoS          → qos_profiles, qos_policies
Building Block Domains      → domains, register_types, topics
Building Block Participants → participants, publishers, subscribers, writers, readers
```

### 커버리지
```
✅ 지원
  struct / enum / union / typedef
  sequence / array / string<N>
  @key / @optional / extensibility
  domain / topic / register_type
  qos_profile 상속 (base_profile_id)
  participant / publisher / subscriber / writer / reader

❌ 미지원 (1차 제외)
  bitmask
  map<K,V>
  qos topic_filter
  domain 상속
  participant 상속
```
