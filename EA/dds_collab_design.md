# DDS Collaboration DB Design Document

## 1. Project Overview

### Purpose
```
Sparx EA QEA -> Collaboration DB -> IDL Generation + Document Generation
Target: RTI DDS / Fast DDS
```

### Development Environment
```
Language : C++11
IDE      : Visual Studio 2019
DB       : SQLite (phase 1) -> PostgreSQL (collaboration server)
UI       : CEF-based (C++ + JS)
Document : Markdown template-based
```

### External Libraries
```
sqlite3        Single-file amalgamation (sqlite3.h + sqlite3.c)
               Location: third_party/sqlite3/
               Download: https://www.sqlite.org/download.html

nlohmann/json  Header-only JSON library (json.hpp)
               Location: third_party/nlohmann/

Any.h          C++11-compatible variant type (replaces std::any)
               Location: src/utils/Any.h
               Note: Lines 19-21 commented out for g++ compatibility
                     MSVC can use original without modification
```

---

## 2. Layer Architecture

### Layer Names
```
EA Model    <- Sparx EA QEA file (source)
Repository  <- Collaboration DB (SQLite or PostgreSQL)
DDS Model   <- C++ objects (in-memory)
```

### Overall Flow
```
EA Model (QEA file)
    |-- EAReader / EAConverter
    v
Repository (SQLite or PostgreSQL)
    |-- SQLiteRepository / PostgreSQLRepository
    v
DDS Model (C++ objects)
    |-- toAny()            -> CEF communication (Any type)
    |-- toJson()           -> Test / debugging (JSON string)
    |-- IDLGenerator       -> RTI/Fast DDS IDL file
    └-- MarkdownGenerator  -> Markdown template-based document
```

### Layer Dependencies
```
ea/          -> third_party/sqlite3  (QEA reading)
repository/  -> third_party/sqlite3
dds/         -> repository/
              -> src/utils/Any.h
generator/   -> dds/
main.cpp     -> all layers
```

---

## 3. Project Folder Structure

```
DDSCollab/
|-- DDSCollab.sln
|
|-- src/
|   |-- ea/                          <- EA Model layer
|   |   |-- EAModels.h               <- EA struct definitions
|   |   |-- EAReader.h / .cpp        <- QEA file reading
|   |   └-- EAConverter.h / .cpp     <- EA -> Repository conversion
|   |
|   |-- repository/                  <- Repository layer
|   |   |-- IRepository.h            <- Abstract interface
|   |   |-- RepositoryModels.h       <- DB struct definitions
|   |   └-- SQLiteRepository.h/.cpp  <- SQLite implementation
|   |
|   |-- dds/                         <- DDS Model layer
|   |   |-- DDSModels.h / .cpp       <- All DDS classes + toAny() / toJson()
|   |   └-- DDSLoader.h / .cpp       <- Repository -> DDS Model loader
|   |
|   |-- generator/                   <- Generator layer
|   |   |-- IDLGenerator.h / .cpp    <- IDL generation
|   |   └-- MarkdownGenerator.h/.cpp <- Markdown document generation (TBD)
|   |
|   |-- utils/
|   |   └-- Any.h                    <- C++11 variant type
|   |
|   └-- main.cpp
|
|-- third_party/
|   |-- sqlite3/
|   |   |-- sqlite3.h                <- SQLite3 header
|   |   |-- sqlite3.c                <- SQLite3 amalgamation (stub, replace with real)
|   |   └-- README.txt               <- Download instructions
|   └-- nlohmann/
|       └-- json.hpp
|
|-- templates/                       <- Markdown templates (TBD)
|   └-- default.md
|
|-- dds_collab.sql                   <- SQLite DDL (15 tables)
└-- CMakeLists.txt
```

---

## 4. Repository Schema (15 Tables)

### Design Principles
```
Base      : OMG DDS JSON specification
id        : UUID (TEXT) - compatible with SQLite and PostgreSQL
Timestamp : created_at / updated_at (TEXT, datetime('now'))
EA origin : ea_guid, ea_stereotype, source columns
source    : 'ea' (converted from EA) | 'manual' (added directly)
```

### Tables with ea_guid (from EA)
```
packages / types / type_members
domains / topics / participants
publishers / subscribers / writers / readers
```

### Tables without ea_guid (created in collaboration DB)
```
projects / qos_profiles / qos_policies
register_types / audit_log
```

---

### Table 1: projects
```sql
id            TEXT PRIMARY KEY
name          TEXT NOT NULL
description   TEXT
version       TEXT
created_at    TEXT
updated_at    TEXT
```

---

### Table 2: packages
```sql
id            TEXT PRIMARY KEY
project_id    TEXT NOT NULL     -- FK -> projects.id
parent_id     TEXT              -- FK -> packages.id (self-ref, NULL = root)
name          TEXT NOT NULL
kind          TEXT              -- 'module'|'type_library'|'domain_library'|'folder'
description   TEXT
ordinal       INTEGER           -- sort order (t_package.TPos)
ea_guid       TEXT              -- EA origin tracking
ea_stereotype TEXT              -- EA original stereotype preserved
source        TEXT              -- 'ea'|'manual'
created_at    TEXT
updated_at    TEXT
```
Note: qualified_name is computed recursively via parent_id (separator: "::")

---

### Table 3: types
```sql
id             TEXT PRIMARY KEY
project_id     TEXT NOT NULL    -- FK -> projects.id
package_id     TEXT             -- FK -> packages.id
name           TEXT NOT NULL
kind           TEXT             -- 'struct'|'enum'|'union'|'typedef'
base_type_id   TEXT             -- FK -> types.id (inheritance, Generalization)
extensibility  TEXT             -- 'final'|'appendable'|'mutable' (default: 'appendable')
description    TEXT
annotations    TEXT             -- JSON (custom tags)
ea_guid        TEXT
ea_object_type TEXT             -- 'Class'|'Enumeration'|'DataType'|'Interface' preserved
ea_stereotype  TEXT             -- original stereotype preserved
source         TEXT             -- 'ea'|'manual'
created_at     TEXT
updated_at     TEXT
```

#### EA -> types.kind Conversion Rules
| Object_Type | Stereotype | kind |
|---|---|---|
| Class | struct / idlStruct | struct |
| Class | enumeration | enum |
| Class | union | union |
| Class | typedef / alias | typedef |
| Class | NULL / '' | struct (default) |
| Enumeration | (any) | enum |
| DataType | (any) | typedef |
| Interface | (any) | struct |

Note: If kind cannot be determined, it is set to NULL for user to specify via Web UI.

---

### Table 4: type_members
```sql
id               TEXT PRIMARY KEY
type_id          TEXT NOT NULL    -- FK -> types.id
name             TEXT NOT NULL
ordinal          INTEGER          -- declaration order (t_attribute.Pos)
member_kind      TEXT             -- 'field'|'literal'|'case'|'discriminator'

-- Type reference (one of)
primitive_type   TEXT             -- 'boolean'|'int8'|'uint8'|'int16'|'uint16'
                                  -- 'int32'|'uint32'|'int64'|'uint64'
                                  -- 'float32'|'float64'|'float128'
                                  -- 'char'|'wchar'|'octet'|'string'|'wstring'
ref_type_id      TEXT             -- FK -> types.id (complex type reference)

-- EA original preserved
ea_type_name     TEXT             -- t_attribute.Type original string
lower_bound      TEXT             -- t_attribute.LowerBound original
upper_bound      TEXT             -- t_attribute.UpperBound original

-- Collection (derived from LowerBound/UpperBound)
is_sequence      INTEGER DEFAULT 0
sequence_bound   INTEGER          -- NULL = unbounded
is_array         INTEGER DEFAULT 0
array_dimensions TEXT             -- JSON "[3,4]" -> stored as vector<int> in C++
string_bound     INTEGER          -- t_attribute.Length

-- Common annotations (columns for frequent use)
is_key           INTEGER DEFAULT 0
is_optional      INTEGER DEFAULT 0

-- Other annotations (stored as JSON)
annotations      TEXT             -- '{"id":5,"range":"0..100","unit":"m/s"}'

-- enum only
enum_value       INTEGER

-- union only
case_labels      TEXT             -- JSON '["0","1"]'|'["default"]'

default_value    TEXT
description      TEXT
ea_guid          TEXT
ea_stereotype    TEXT             -- 'idlField'|'key'|'foreignKey' preserved
source           TEXT             -- 'ea'|'manual'
created_at       TEXT
updated_at       TEXT
```

#### LowerBound/UpperBound -> Collection Conversion Rules
```
UpperBound = '0' or '*'             -> is_sequence=1, sequence_bound=NULL (unbounded)
LowerBound = '0', UpperBound = '1'  -> is_optional=1
LowerBound = UpperBound = N (N>1)   -> is_array=1, array_dimensions=[N]
LowerBound < UpperBound             -> is_sequence=1, sequence_bound=UpperBound
LowerBound = UpperBound = '1'       -> single member (default)
```

#### is_key Detection Rules
```
t_attribute.Stereotype = 'key'
OR t_attributetag.Property = 'isDCPSKey' AND VALUE = 'true'
-> is_key = 1
```

#### EA Primitive Type Conversion
```
'long', 'int'           -> int32
'short'                 -> int16
'unsigned long'         -> uint32
'unsigned short'        -> uint16
'long long'             -> int64
'unsigned long long'    -> uint64
'float'                 -> float32
'double'                -> float64
'long double'           -> float128
'bool', 'boolean'       -> boolean
'char*', 'string'       -> string
others                  -> ref_type_id (match by types.name)
```

---

### Table 5: domains
```sql
id            TEXT PRIMARY KEY
project_id    TEXT NOT NULL    -- FK -> projects.id
package_id    TEXT             -- FK -> packages.id
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

### Table 6: register_types
```sql
id            TEXT PRIMARY KEY
domain_id     TEXT NOT NULL    -- FK -> domains.id
type_id       TEXT NOT NULL    -- FK -> types.id
register_name TEXT             -- registration name (NULL = use types.name)
description   TEXT
created_at    TEXT
updated_at    TEXT
```
Note: Same type can be registered multiple times with different names in same domain.

---

### Table 7: topics
```sql
id               TEXT PRIMARY KEY
project_id       TEXT NOT NULL   -- FK -> projects.id
package_id       TEXT            -- FK -> packages.id
domain_id        TEXT            -- FK -> domains.id (nullable)
name             TEXT NOT NULL
register_type_id TEXT            -- FK -> register_types.id
qos_profile_id   TEXT            -- FK -> qos_profiles.id
description      TEXT
ea_guid          TEXT
ea_stereotype    TEXT
source           TEXT            -- 'ea'|'manual'
created_at       TEXT
updated_at       TEXT
```
Note: topics.type_id removed. Type is accessed via register_types.type_id.

#### topic -> type Connection (from QEA)
```
t_objectproperties.Property = 'type'
Value (ea_guid) -> types.ea_guid match
-> register_types INSERT
-> topics.register_type_id UPDATE
```

---

### Table 8: qos_profiles
```sql
id              TEXT PRIMARY KEY
project_id      TEXT NOT NULL   -- FK -> projects.id
name            TEXT NOT NULL
base_profile_id TEXT            -- FK -> qos_profiles.id (inheritance)
description     TEXT
created_at      TEXT
updated_at      TEXT
```

---

### Table 9: qos_policies
```sql
id            TEXT PRIMARY KEY
profile_id    TEXT NOT NULL    -- FK -> qos_profiles.id
entity_kind   TEXT             -- 'topic'|'writer'|'reader'|'participant'
policy_name   TEXT             -- 'DURABILITY'|'RELIABILITY'|'DEADLINE'
                               -- 'HISTORY'|'LIVELINESS'|'OWNERSHIP'
                               -- 'RESOURCE_LIMITS'|'LIFESPAN' etc.
policy_value  TEXT             -- JSON e.g. '{"kind":"RELIABLE","max_blocking_time":"100ms"}'
created_at    TEXT
updated_at    TEXT
```

#### policy_value JSON Examples
```json
DURABILITY:      {"kind":"TRANSIENT_LOCAL"}
RELIABILITY:     {"kind":"RELIABLE","max_blocking_time":"100ms"}
HISTORY:         {"kind":"KEEP_LAST","depth":10}
DEADLINE:        {"period":"500ms"}
LIVELINESS:      {"kind":"AUTOMATIC","lease_duration":"1s"}
RESOURCE_LIMITS: {"max_samples":100,"max_instances":10}
```

---

### Table 10: participants
```sql
id             TEXT PRIMARY KEY
project_id     TEXT NOT NULL   -- FK -> projects.id
package_id     TEXT            -- FK -> packages.id
domain_id      TEXT            -- FK -> domains.id
name           TEXT NOT NULL
qos_profile_id TEXT            -- FK -> qos_profiles.id
description    TEXT
ea_guid        TEXT
ea_stereotype  TEXT
source         TEXT            -- 'ea'|'manual'
created_at     TEXT
updated_at     TEXT
```

#### domain -> participant Connection (from QEA)
```
t_objectproperties.Property = 'domain'
Value (ea_guid) -> domains.ea_guid match
-> participants.domain_id UPDATE
```

---

### Table 11: publishers
```sql
id             TEXT PRIMARY KEY
participant_id TEXT NOT NULL   -- FK -> participants.id
name           TEXT NOT NULL
qos_profile_id TEXT            -- FK -> qos_profiles.id
description    TEXT
ea_guid        TEXT
ea_stereotype  TEXT
source         TEXT            -- 'ea'|'manual'
created_at     TEXT
updated_at     TEXT
```

---

### Table 12: subscribers
```sql
id             TEXT PRIMARY KEY
participant_id TEXT NOT NULL   -- FK -> participants.id
name           TEXT NOT NULL
qos_profile_id TEXT            -- FK -> qos_profiles.id
description    TEXT
ea_guid        TEXT
ea_stereotype  TEXT
source         TEXT            -- 'ea'|'manual'
created_at     TEXT
updated_at     TEXT
```

---

### Table 13: writers
```sql
id             TEXT PRIMARY KEY
publisher_id   TEXT NOT NULL   -- FK -> publishers.id
topic_id       TEXT            -- FK -> topics.id
name           TEXT NOT NULL
qos_profile_id TEXT            -- FK -> qos_profiles.id
description    TEXT
ea_guid        TEXT
ea_stereotype  TEXT
source         TEXT            -- 'ea'|'manual'
created_at     TEXT
updated_at     TEXT
```

---

### Table 14: readers
```sql
id             TEXT PRIMARY KEY
subscriber_id  TEXT NOT NULL   -- FK -> subscribers.id
topic_id       TEXT            -- FK -> topics.id
name           TEXT NOT NULL
qos_profile_id TEXT            -- FK -> qos_profiles.id
description    TEXT
ea_guid        TEXT
ea_stereotype  TEXT
source         TEXT            -- 'ea'|'manual'
created_at     TEXT
updated_at     TEXT
```

---

### Table 15: audit_log
```sql
id          TEXT PRIMARY KEY
project_id  TEXT             -- FK -> projects.id
target_kind TEXT             -- 'type'|'type_member'|'package'|'topic'
                             -- 'domain'|'register_type'|'qos_profile'
                             -- 'participant'|'publisher'|'subscriber'
                             -- 'writer'|'reader'
target_id   TEXT
action      TEXT             -- 'create'|'update'|'delete'|'ea_sync'
changed_by  TEXT             -- username or 'ea_import'
changed_at  TEXT
diff        TEXT             -- JSON '{"before":{...},"after":{...}}'
```

---

## 5. EA -> Repository Conversion

### EA Tables Used
| EA Table | Used | Notes |
|---|---|---|
| t_package | YES | Only required packages (parent chain of DDS objects) |
| t_object | YES | DDS stereotype filter + root package scope filter |
| t_attribute | YES | Only objects belonging to DDS-related types |
| t_attributetag | YES | @key, @optional etc. |
| t_connector | YES | Connector_Type filter |
| t_objectproperties | YES | topic->type, participant->domain connection |
| t_taggedvalue | PARTIAL | extensibility and some metadata only |
| t_xref | NO | Not needed |
| t_connectortag | NO | Not needed |

---

### Conversion Flow

#### Step 1. Determine Target Package Scope
```
If root_package_name is specified:
  Find root package ID by name (t_package.Name match)
  Collect all child package IDs recursively
  -> target_pkg_ids

If root_package_name is empty:
  Use all package IDs
  -> target_pkg_ids
```

#### Step 2. Read DDS-related t_object within target packages
```sql
SELECT Object_ID, Name, Object_Type, Stereotype,
       Package_ID, Note, ea_guid, Classifier_guid, Classifier, ParentID
FROM t_object
WHERE Package_ID IN (target_pkg_ids)
AND (
  (Object_Type IN ('Class','Interface')
   AND Stereotype IN ('struct','idlStruct','enumeration',
                      'union','typedef','alias'))
  OR Object_Type IN ('Enumeration','DataType')
  OR (Object_Type IN ('Part','Component','Port')
      AND Stereotype IN ('topic','domain','domainParticipant',
                         'publisher','subscriber',
                         'dataWriter','dataReader','qosProperty'))
)
```

#### Step 3. Collect required t_package (parent chain only)
```
Collect Package_IDs from Step 2 results
-> Recursively trace Parent_ID upward
-> Intersect with target_pkg_ids (stay within root scope)
-> INSERT only required packages
```

#### Step 4. t_object -> Table Classification
```
Object_Type = 'Class' | 'Interface' | 'Enumeration' | 'DataType'
  -> types

Object_Type = 'Part'
  Stereotype = 'domain'            -> domains
  Stereotype = 'topic'             -> topics (type link set in Step 7)
  Stereotype = 'publisher'         -> publishers
  Stereotype = 'subscriber'        -> subscribers
  Stereotype = 'qosProperty'       -> qos_policies

Object_Type = 'Component'
  Stereotype = 'domainParticipant' -> participants
  Stereotype = 'ddsAppTarget'      -> ignored

Object_Type = 'Port'
  Stereotype = 'dataReader'        -> readers
  Stereotype = 'dataWriter'        -> writers
```

#### Step 5. t_attribute -> type_members
```sql
SELECT a.ID, a.Object_ID, a.Name, a.Type, a.Stereotype,
       a.LowerBound, a.UpperBound, a."Default", a.Classifier,
       a.Notes, a.Pos, a.ea_guid
FROM t_attribute a
WHERE a.Object_ID IN (type object IDs from Step 4)
ORDER BY a.Object_ID, a.Pos
```

```
ref_type_id resolution:
  t_attribute.Classifier (Object_ID) -> types.ea_guid match (preferred)
  Classifier = 0 or NULL -> match by t_attribute.Type string (types.name)
```

#### Step 6. t_objectproperties -> Connection Processing
```
Property = 'type'
  Value (ea_guid) -> types.ea_guid match
  -> register_types INSERT
  -> topics.register_type_id UPDATE

Property = 'domain'
  Value (ea_guid) -> domains.ea_guid match
  -> participants.domain_id UPDATE

Property = 'typedef'
  -> types.kind = 'typedef' determination

Property = 'typeSynonyms'
  -> alias original type name
```

#### Step 7. t_connector -> Relationship Processing
```
Connector_Type = 'Generalization'
  Start_Object_ID (child) -> End_Object_ID (parent)
  -> types.base_type_id UPDATE

Connector_Type = 'Association' / 'Aggregation'
  -> type_members.ref_type_id

Connector_Type = 'Dependency'
  SubType = 'use' OR Stereotype = 'use'
  -> type_members.ref_type_id
  others -> ignored

Realization / Connector / NoteLink -> ignored
```

#### Step 8. t_attributetag -> type_members Update
```
Property = 'isDCPSKey', VALUE = 'true'  -> is_key = 1
Property = 'isDCPSKey', VALUE = 'false' -> is_key = 0
Property = 'isOptional', VALUE = 'true' -> is_optional = 1
others -> append to annotations JSON
```

#### Step 9. audit_log Record
```
action     = 'ea_sync'
changed_by = 'ea_import'
diff       = {"source":"file.qea","root_package":"...","types":N,"members":N}
```

---

### EA Re-sync Rules
```
Search existing row by ea_guid
  Found:
    source='ea'     -> UPDATE
    source='manual' -> conflict detected -> record in audit_log, user decides
  Not found -> INSERT (new element)

ea_guid exists in DB but not in EA:
  -> Deleted in EA -> confirm with user before DELETE
```

---

## 6. DDS Model (C++ Classes)

### Class Structure
```
DDSProject
  |-- vector<DDSPackage>      (root packages only, tree via children)
  |     |-- vector<DDSType>
  |     |     └-- vector<DDSMember>
  |     └-- vector<DDSPackage>  (children, recursive)
  |-- vector<DDSDomain>
  |     |-- vector<DDSRegisterType>
  |     └-- vector<DDSTopic>
  |-- vector<DDSQosProfile>
  |     └-- vector<DDSQosPolicy>
  └-- vector<DDSParticipant>
        |-- vector<DDSPublisher>
        |     └-- vector<DDSWriter>
        └-- vector<DDSSubscriber>
              └-- vector<DDSReader>
```

### File Structure (actual)
```
dds/
  DDSModels.h / .cpp   <- All DDS classes in one file
                          (DDSProject, DDSPackage, DDSType, DDSMember,
                           DDSDomain, DDSTopic, DDSQosProfile, DDSQosPolicy,
                           DDSRegisterType, DDSParticipant,
                           DDSPublisher, DDSSubscriber, DDSWriter, DDSReader)
  DDSLoader.h / .cpp   <- Loads DDS Model from Repository
```

### Method Naming Rules
```
Internal conversion (to prefix)
  toAny()   -> Any type (for CEF communication)
  toJson()  -> JSON string (for test / debugging)

File generation (separate Generator classes)
  IDLGenerator::generateIDL()            -> RTI/Fast DDS IDL file
  MarkdownGenerator::generateMarkdown()  -> Markdown document (TBD)
```

### toAny() Usage
```cpp
// Any.h provides: Any, VariantDict, VariantList, AnyCast<T>

Any result = type.toAny();

// Access as map
VariantDict dict = AnyCast<VariantDict>(result);
std::string name = AnyCast<std::string>(dict["name"]);
bool is_key      = AnyCast<bool>(dict["is_key"]);

// Access list
VariantList members = AnyCast<VariantList>(dict["members"]);
for (const Any& m : members) {
    VariantDict mdict = AnyCast<VariantDict>(m);
}
```

### IRepository Interface
```cpp
class IRepository {
public:
    // Connection
    virtual bool open(const std::string& connection_string) = 0;
    virtual void close() = 0;
    virtual bool isOpen() const = 0;
    virtual bool initSchema(const std::string& ddl_path) = 0;

    // CRUD (one per table)
    virtual bool saveProject    (const Project& p)     = 0;
    virtual bool savePackage    (const Package& p)     = 0;
    virtual bool saveType       (const Type& t)        = 0;
    virtual bool saveMember     (const TypeMember& m)  = 0;
    virtual bool saveDomain     (const Domain& d)      = 0;
    virtual bool saveRegisterType(const RegisterType&) = 0;
    virtual bool saveTopic      (const Topic& t)       = 0;
    virtual bool saveQosProfile (const QosProfile& p)  = 0;
    virtual bool saveQosPolicy  (const QosPolicy& p)   = 0;
    virtual bool saveParticipant(const Participant& p) = 0;
    virtual bool savePublisher  (const Publisher& p)   = 0;
    virtual bool saveSubscriber (const Subscriber& s)  = 0;
    virtual bool saveWriter     (const Writer& w)      = 0;
    virtual bool saveReader     (const Reader& r)      = 0;
    virtual bool saveAuditLog   (const AuditLog& log)  = 0;

    // Load
    virtual Project                  loadProject   (const std::string& id) = 0;
    virtual std::vector<Type>        loadTypes     (const std::string& project_id) = 0;
    virtual std::vector<TypeMember>  loadMembers   (const std::string& type_id) = 0;
    virtual std::vector<Domain>      loadDomains   (const std::string& project_id) = 0;
    virtual std::vector<Topic>       loadTopics    (const std::string& project_id) = 0;
    virtual std::vector<Package>     loadPackages  (const std::string& project_id) = 0;
    // ...

    // Find by ea_guid (for re-sync)
    virtual std::string findPackageByEaGuid(const std::string& ea_guid) = 0;
    virtual std::string findTypeByEaGuid   (const std::string& ea_guid) = 0;
    virtual std::string findDomainByEaGuid (const std::string& ea_guid) = 0;
    virtual std::string findTopicByEaGuid  (const std::string& ea_guid) = 0;

    // Transaction
    virtual bool beginTransaction()    = 0;
    virtual bool commitTransaction()   = 0;
    virtual bool rollbackTransaction() = 0;

    virtual std::string getLastError() const = 0;
};
```

---

## 7. IDL Generator

### IDLGenerator Class
```cpp
// generator/IDLGenerator.h
class IDLGenerator {
public:
    std::string generateIDL        (const DDS::DDSProject& project);
    std::string generateTypeIDL    (const DDS::DDSType& type, int indent = 0);
    std::string generatePackageIDL (const DDS::DDSPackage& pkg, int indent = 0);
private:
    std::string generateStructIDL  (const DDS::DDSType& type, int indent);
    std::string generateEnumIDL    (const DDS::DDSType& type, int indent);
    std::string generateUnionIDL   (const DDS::DDSType& type, int indent);
    std::string generateTypedefIDL (const DDS::DDSType& type, int indent);
    std::string generateMemberIDL  (const DDS::DDSMember& member);
    std::string getMemberTypeStr   (const DDS::DDSMember& member);
    std::string getAnnotationStr   (const DDS::DDSMember& member);
    std::string getExtensibilityAnnotation(const DDS::DDSType& type);
};
```

### IDL Type Mapping
```
DDS primitive_type -> IDL type
  boolean    -> boolean
  octet      -> octet
  char       -> char
  wchar      -> wchar
  int8       -> int8
  uint8      -> uint8
  int16      -> short
  uint16     -> unsigned short
  int32      -> long
  uint32     -> unsigned long
  int64      -> long long
  uint64     -> unsigned long long
  float32    -> float
  float64    -> double
  float128   -> long double
  string     -> string        (unbounded)
  string+bound -> string<N>   (bounded)
  wstring    -> wstring

Collection expressions:
  is_sequence=1, bound=NULL -> sequence<T>
  is_sequence=1, bound=N    -> sequence<T, N>
  is_array=1, dims=[N]      -> T member[N]
  string_bound=N            -> string<N>

Annotations:
  is_key=1      -> @key
  is_optional=1 -> @optional
  extensibility -> @final | @mutable (appendable is default, omitted)

Inheritance:
  base_type_name set -> struct Child : Parent { ... };
```

### IDL Output Example
```idl
// DDS IDL - Generated by DDSCollab
// Project: DDS Example Project
// Version: 1.0

module DDS_Example_Models {

    module Hello_World {

        struct HelloWorldType {
            string message;
            long sequence;
        };

    }; // module Hello_World

    module Net_Chat {

        module DCPS {

            struct MessageType {
                string message;
                @key long index;
                long userID;
            };

            struct UserType {
                @key long userID;
                string name;
                long messageID;
            };

        }; // module DCPS

    }; // module Net_Chat

}; // module DDS_Example_Models
```

---

## 8. Build and Usage

### Build (Linux/Mac)
```bash
# Initialize DB schema
sqlite3 collab.db < dds_collab.sql

# Build
g++ -std=c++11 -I./src -I./third_party/sqlite3 \
    src/main.cpp \
    src/ea/EAReader.cpp \
    src/ea/EAConverter.cpp \
    src/repository/SQLiteRepository.cpp \
    src/dds/DDSModels.cpp \
    src/dds/DDSLoader.cpp \
    src/generator/IDLGenerator.cpp \
    -lsqlite3 -o dds_collab
```

### Build (Visual Studio 2019)
```
Project type     : Console Application
C++ Standard     : /std:c++11
Additional Include: src; third_party/sqlite3
Add to project   : sqlite3.c (download amalgamation)
Remove           : -lsqlite3 flag
```

### CMake
```bash
cmake -B build
cmake --build build
```

### Usage
```bash
# With root package filter (recommended)
./dds_collab <qea_file> <output_db> [project_name] [root_package]

./dds_collab DDS_Example.qea collab.db "MyProject" "DDS Example Models"

# Without filter (all DDS-stereotyped objects)
./dds_collab DDS_Example.qea collab.db "MyProject"
```

### Output Files
```
collab.db       -> Collaboration SQLite DB
collab.db.idl   -> Generated DDS IDL
collab.db.json  -> Full DDS Model as JSON
```

---

## 9. Implementation Progress

### Completed
```
Phase 1: Repository (SQLite DDL + SQLiteRepository)  [DONE]
Phase 2: EA Model -> Repository (EAReader + EAConverter) [DONE]
Phase 3: DDS Model (DDSModels + DDSLoader + toAny/toJson) [DONE]
Phase 4: IDL Generation (IDLGenerator) [DONE]
```

### In Progress / TBD
```
Phase 5: Markdown document generation
  MarkdownGenerator.h / .cpp
  generateMarkdown() implementation
  Markdown template design (templates/default.md)

Phase 6: PostgreSQL support
  PostgreSQLRepository.h / .cpp
  IRepository interface already defined

Phase 7: CEF integration
  toAny() already implemented
  CEF IPC binding TBD
```

---

## 10. OMG DDS JSON Specification Coverage

### Building Block Mapping
```
Building Block Types        -> types, type_members
Building Block QoS          -> qos_profiles, qos_policies
Building Block Domains      -> domains, register_types, topics
Building Block Participants -> participants, publishers, subscribers, writers, readers
```

### Coverage
```
Supported:
  struct / enum / union / typedef
  sequence<T> / sequence<T,N> / array<T,N> / string<N>
  @key / @optional / extensibility (@final/@mutable/@appendable)
  domain / topic / register_type
  qos_profile inheritance (base_profile_id)
  participant / publisher / subscriber / writer / reader
  Root package scope filtering

Not supported (phase 1 exclusion):
  bitmask
  map<K,V>
  qos topic_filter
  domain inheritance (base_domain_id)
  participant inheritance (base_participant_id)
```
