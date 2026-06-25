-- ============================================================
-- DDS 협업 DB - SQLite DDL
-- 기반: OMG DDS JSON 스펙
-- 버전: 1.0
-- ============================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA encoding = 'UTF-8';

-- ============================================================
-- 1. projects
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    description   TEXT,
    version       TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 2. packages
-- EA: t_package
-- ============================================================
CREATE TABLE IF NOT EXISTS packages (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL,
    parent_id     TEXT,                  -- 자기참조, NULL이면 최상위
    name          TEXT NOT NULL,
    kind          TEXT,                  -- 'module'|'type_library'|'domain_library'|'folder'
    description   TEXT,
    ordinal       INTEGER,               -- 정렬 순서 (t_package.TPos)
    ea_guid       TEXT,                  -- EA 원본 추적
    ea_stereotype TEXT,                  -- EA 원본 보존
    source        TEXT NOT NULL DEFAULT 'ea',  -- 'ea'|'manual'
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (parent_id)  REFERENCES packages(id)
);

CREATE INDEX IF NOT EXISTS idx_packages_project_id  ON packages(project_id);
CREATE INDEX IF NOT EXISTS idx_packages_parent_id   ON packages(parent_id);
CREATE INDEX IF NOT EXISTS idx_packages_ea_guid     ON packages(ea_guid);

-- ============================================================
-- 3. types
-- EA: t_object (Class, Interface, Enumeration, DataType)
-- ============================================================
CREATE TABLE IF NOT EXISTS types (
    id             TEXT PRIMARY KEY,
    project_id     TEXT NOT NULL,
    package_id     TEXT,
    name           TEXT NOT NULL,
    kind           TEXT,                 -- 'struct'|'enum'|'union'|'typedef'
    base_type_id   TEXT,                 -- FK → types.id (상속, Generalization)
    extensibility  TEXT DEFAULT 'appendable',  -- 'final'|'appendable'|'mutable'
    description    TEXT,
    annotations    TEXT,                 -- JSON (커스텀 태그)
    ea_guid        TEXT,
    ea_object_type TEXT,                 -- 'Class'|'Enumeration'|'DataType'|'Interface'
    ea_stereotype  TEXT,                 -- 원본 보존
    source         TEXT NOT NULL DEFAULT 'ea',
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (project_id)   REFERENCES projects(id),
    FOREIGN KEY (package_id)   REFERENCES packages(id),
    FOREIGN KEY (base_type_id) REFERENCES types(id)
);

CREATE INDEX IF NOT EXISTS idx_types_project_id  ON types(project_id);
CREATE INDEX IF NOT EXISTS idx_types_package_id  ON types(package_id);
CREATE INDEX IF NOT EXISTS idx_types_ea_guid     ON types(ea_guid);
CREATE INDEX IF NOT EXISTS idx_types_kind        ON types(kind);

-- ============================================================
-- 4. type_members
-- EA: t_attribute
-- ============================================================
CREATE TABLE IF NOT EXISTS type_members (
    id               TEXT PRIMARY KEY,
    type_id          TEXT NOT NULL,
    name             TEXT NOT NULL,
    ordinal          INTEGER,            -- 선언 순서 (t_attribute.Pos)
    member_kind      TEXT,               -- 'field'|'literal'|'case'|'discriminator'

    -- 타입 참조 (둘 중 하나)
    primitive_type   TEXT,               -- 'boolean'|'int8'|'uint8'|'int16'|'uint16'
                                         -- 'int32'|'uint32'|'int64'|'uint64'
                                         -- 'float32'|'float64'|'float128'
                                         -- 'char'|'wchar'|'octet'|'string'|'wstring'
    ref_type_id      TEXT,               -- FK → types.id (복합 타입 참조)

    -- EA 원본 보존
    ea_type_name     TEXT,               -- t_attribute.Type 원본 문자열
    lower_bound      TEXT,               -- t_attribute.LowerBound 원본
    upper_bound      TEXT,               -- t_attribute.UpperBound 원본

    -- 컬렉션 (LowerBound/UpperBound 파생)
    is_sequence      INTEGER NOT NULL DEFAULT 0,
    sequence_bound   INTEGER,            -- NULL이면 unbounded
    is_array         INTEGER NOT NULL DEFAULT 0,
    array_dimensions TEXT,               -- JSON "[3,4]"
    string_bound     INTEGER,            -- t_attribute.Length

    -- 자주 쓰는 annotation
    is_key           INTEGER NOT NULL DEFAULT 0,
    is_optional      INTEGER NOT NULL DEFAULT 0,

    -- 나머지 annotation
    annotations      TEXT,               -- JSON '{"id":5,"range":"0..100"}'

    -- enum 전용
    enum_value       INTEGER,

    -- union 전용
    case_labels      TEXT,               -- JSON '["0","1"]'|'["default"]'

    default_value    TEXT,
    description      TEXT,
    ea_guid          TEXT,
    ea_stereotype    TEXT,               -- 'idlField'|'key'|'foreignKey' 원본
    source           TEXT NOT NULL DEFAULT 'ea',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (type_id)    REFERENCES types(id),
    FOREIGN KEY (ref_type_id) REFERENCES types(id)
);

CREATE INDEX IF NOT EXISTS idx_type_members_type_id    ON type_members(type_id);
CREATE INDEX IF NOT EXISTS idx_type_members_ea_guid    ON type_members(ea_guid);
CREATE INDEX IF NOT EXISTS idx_type_members_ref_type   ON type_members(ref_type_id);

-- ============================================================
-- 5. domains
-- EA: t_object (Part, stereotype='domain')
-- ============================================================
CREATE TABLE IF NOT EXISTS domains (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL,
    package_id    TEXT,
    name          TEXT NOT NULL,
    domain_id     INTEGER,               -- DDS Domain ID (0~232)
    description   TEXT,
    ea_guid       TEXT,
    ea_stereotype TEXT,
    source        TEXT NOT NULL DEFAULT 'ea',
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (package_id) REFERENCES packages(id)
);

CREATE INDEX IF NOT EXISTS idx_domains_project_id ON domains(project_id);
CREATE INDEX IF NOT EXISTS idx_domains_ea_guid    ON domains(ea_guid);

-- ============================================================
-- 6. register_types
-- domain 안에 type을 등록 (등록 이름 ≠ 타입 이름 가능)
-- ============================================================
CREATE TABLE IF NOT EXISTS register_types (
    id            TEXT PRIMARY KEY,
    domain_id     TEXT NOT NULL,
    type_id       TEXT NOT NULL,
    register_name TEXT,                  -- NULL이면 types.name 사용
    description   TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (domain_id) REFERENCES domains(id),
    FOREIGN KEY (type_id)   REFERENCES types(id)
);

CREATE INDEX IF NOT EXISTS idx_register_types_domain_id ON register_types(domain_id);
CREATE INDEX IF NOT EXISTS idx_register_types_type_id   ON register_types(type_id);

-- ============================================================
-- 7. topics
-- EA: t_object (Part, stereotype='topic')
-- ============================================================
CREATE TABLE IF NOT EXISTS topics (
    id               TEXT PRIMARY KEY,
    project_id       TEXT NOT NULL,
    package_id       TEXT,
    domain_id        TEXT,               -- NULL 허용
    name             TEXT NOT NULL,
    register_type_id TEXT,               -- FK → register_types.id
    qos_profile_id   TEXT,               -- FK → qos_profiles.id
    description      TEXT,
    ea_guid          TEXT,
    ea_stereotype    TEXT,
    source           TEXT NOT NULL DEFAULT 'ea',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (project_id)       REFERENCES projects(id),
    FOREIGN KEY (package_id)       REFERENCES packages(id),
    FOREIGN KEY (domain_id)        REFERENCES domains(id),
    FOREIGN KEY (register_type_id) REFERENCES register_types(id),
    FOREIGN KEY (qos_profile_id)   REFERENCES qos_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_topics_project_id       ON topics(project_id);
CREATE INDEX IF NOT EXISTS idx_topics_domain_id        ON topics(domain_id);
CREATE INDEX IF NOT EXISTS idx_topics_register_type_id ON topics(register_type_id);
CREATE INDEX IF NOT EXISTS idx_topics_ea_guid          ON topics(ea_guid);

-- ============================================================
-- 8. qos_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS qos_profiles (
    id              TEXT PRIMARY KEY,
    project_id      TEXT NOT NULL,
    name            TEXT NOT NULL,
    base_profile_id TEXT,                -- FK → qos_profiles.id (상속)
    description     TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (project_id)      REFERENCES projects(id),
    FOREIGN KEY (base_profile_id) REFERENCES qos_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_qos_profiles_project_id ON qos_profiles(project_id);

-- ============================================================
-- 9. qos_policies
-- ============================================================
CREATE TABLE IF NOT EXISTS qos_policies (
    id            TEXT PRIMARY KEY,
    profile_id    TEXT NOT NULL,
    entity_kind   TEXT,                  -- 'topic'|'writer'|'reader'|'participant'
    policy_name   TEXT,                  -- 'DURABILITY'|'RELIABILITY'|'DEADLINE'
                                         -- 'HISTORY'|'LIVELINESS'|'OWNERSHIP'
                                         -- 'RESOURCE_LIMITS'|'LIFESPAN' 등
    policy_value  TEXT,                  -- JSON
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (profile_id) REFERENCES qos_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_qos_policies_profile_id ON qos_policies(profile_id);

-- ============================================================
-- 10. participants
-- EA: t_object (Component, stereotype='domainParticipant')
-- ============================================================
CREATE TABLE IF NOT EXISTS participants (
    id             TEXT PRIMARY KEY,
    project_id     TEXT NOT NULL,
    package_id     TEXT,
    domain_id      TEXT,
    name           TEXT NOT NULL,
    qos_profile_id TEXT,
    description    TEXT,
    ea_guid        TEXT,
    ea_stereotype  TEXT,
    source         TEXT NOT NULL DEFAULT 'ea',
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (project_id)     REFERENCES projects(id),
    FOREIGN KEY (package_id)     REFERENCES packages(id),
    FOREIGN KEY (domain_id)      REFERENCES domains(id),
    FOREIGN KEY (qos_profile_id) REFERENCES qos_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_participants_project_id ON participants(project_id);
CREATE INDEX IF NOT EXISTS idx_participants_domain_id  ON participants(domain_id);
CREATE INDEX IF NOT EXISTS idx_participants_ea_guid    ON participants(ea_guid);

-- ============================================================
-- 11. publishers
-- EA: t_object (Part, stereotype='publisher')
-- ============================================================
CREATE TABLE IF NOT EXISTS publishers (
    id             TEXT PRIMARY KEY,
    participant_id TEXT NOT NULL,
    name           TEXT NOT NULL,
    qos_profile_id TEXT,
    description    TEXT,
    ea_guid        TEXT,
    ea_stereotype  TEXT,
    source         TEXT NOT NULL DEFAULT 'ea',
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (participant_id) REFERENCES participants(id),
    FOREIGN KEY (qos_profile_id) REFERENCES qos_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_publishers_participant_id ON publishers(participant_id);
CREATE INDEX IF NOT EXISTS idx_publishers_ea_guid        ON publishers(ea_guid);

-- ============================================================
-- 12. subscribers
-- EA: t_object (Part, stereotype='subscriber')
-- ============================================================
CREATE TABLE IF NOT EXISTS subscribers (
    id             TEXT PRIMARY KEY,
    participant_id TEXT NOT NULL,
    name           TEXT NOT NULL,
    qos_profile_id TEXT,
    description    TEXT,
    ea_guid        TEXT,
    ea_stereotype  TEXT,
    source         TEXT NOT NULL DEFAULT 'ea',
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (participant_id) REFERENCES participants(id),
    FOREIGN KEY (qos_profile_id) REFERENCES qos_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_subscribers_participant_id ON subscribers(participant_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_ea_guid        ON subscribers(ea_guid);

-- ============================================================
-- 13. writers
-- EA: t_object (Port, stereotype='dataWriter')
-- ============================================================
CREATE TABLE IF NOT EXISTS writers (
    id             TEXT PRIMARY KEY,
    publisher_id   TEXT NOT NULL,
    topic_id       TEXT,
    name           TEXT NOT NULL,
    qos_profile_id TEXT,
    description    TEXT,
    ea_guid        TEXT,
    ea_stereotype  TEXT,
    source         TEXT NOT NULL DEFAULT 'ea',
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (publisher_id)   REFERENCES publishers(id),
    FOREIGN KEY (topic_id)       REFERENCES topics(id),
    FOREIGN KEY (qos_profile_id) REFERENCES qos_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_writers_publisher_id ON writers(publisher_id);
CREATE INDEX IF NOT EXISTS idx_writers_topic_id     ON writers(topic_id);
CREATE INDEX IF NOT EXISTS idx_writers_ea_guid      ON writers(ea_guid);

-- ============================================================
-- 14. readers
-- EA: t_object (Port, stereotype='dataReader')
-- ============================================================
CREATE TABLE IF NOT EXISTS readers (
    id             TEXT PRIMARY KEY,
    subscriber_id  TEXT NOT NULL,
    topic_id       TEXT,
    name           TEXT NOT NULL,
    qos_profile_id TEXT,
    description    TEXT,
    ea_guid        TEXT,
    ea_stereotype  TEXT,
    source         TEXT NOT NULL DEFAULT 'ea',
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (subscriber_id)  REFERENCES subscribers(id),
    FOREIGN KEY (topic_id)       REFERENCES topics(id),
    FOREIGN KEY (qos_profile_id) REFERENCES qos_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_readers_subscriber_id ON readers(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_readers_topic_id      ON readers(topic_id);
CREATE INDEX IF NOT EXISTS idx_readers_ea_guid       ON readers(ea_guid);

-- ============================================================
-- 15. audit_log
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id          TEXT PRIMARY KEY,
    project_id  TEXT,
    target_kind TEXT,                    -- 'type'|'type_member'|'package'|'topic'
                                         -- 'domain'|'register_type'|'qos_profile'
                                         -- 'participant'|'publisher'|'subscriber'
                                         -- 'writer'|'reader'
    target_id   TEXT,
    action      TEXT,                    -- 'create'|'update'|'delete'|'ea_sync'
    changed_by  TEXT,                    -- 사용자명 or 'ea_import'
    changed_at  TEXT NOT NULL DEFAULT (datetime('now')),
    diff        TEXT,                    -- JSON '{"before":{...},"after":{...}}'

    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_project_id  ON audit_log(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target_id   ON audit_log(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at  ON audit_log(changed_at);

-- ============================================================
-- qualified_name 재귀 조회 뷰 (참고용)
-- ============================================================
CREATE VIEW IF NOT EXISTS v_package_path AS
WITH RECURSIVE path(id, name, parent_id, full_path) AS (
    SELECT id, name, parent_id, name
    FROM packages
    WHERE parent_id IS NULL

    UNION ALL

    SELECT p.id, p.name, p.parent_id,
           path.full_path || '::' || p.name
    FROM packages p
    JOIN path ON p.parent_id = path.id
)
SELECT id, name, full_path as qualified_name
FROM path;

