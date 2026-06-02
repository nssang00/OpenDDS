// Database.h
#include <sqlite3.h>
#include <string>
#include <vector>
#include <functional>
#include <stdexcept>

// ─────────────────────────────────────────
// Statement : PreparedStatement 역할
// ─────────────────────────────────────────
class Statement {
public:
    Statement(sqlite3* db, const std::string& sql) {
        if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt_, nullptr) != SQLITE_OK)
            throw std::runtime_error(sqlite3_errmsg(db));
    }
    ~Statement() { sqlite3_finalize(stmt_); }  // 자동 해제

    // 파라미터 바인딩 (1-based index)
    Statement& bind(int idx, int val)                { sqlite3_bind_int(stmt_, idx, val);                          return *this; }
    Statement& bind(int idx, double val)             { sqlite3_bind_double(stmt_, idx, val);                       return *this; }
    Statement& bind(int idx, const std::string& val) { sqlite3_bind_text(stmt_, idx, val.c_str(), -1, SQLITE_TRANSIENT); return *this; }
    Statement& bindNull(int idx)                     { sqlite3_bind_null(stmt_, idx);                              return *this; }

    // INSERT / UPDATE / DELETE
    void execute() {
        if (sqlite3_step(stmt_) != SQLITE_DONE) reset();  // 에러 무시 or throw
        reset();
    }

    // SELECT — 행마다 콜백 호출
    void query(std::function<void(Statement&)> callback) {
        while (sqlite3_step(stmt_) == SQLITE_ROW)
            callback(*this);
        reset();
    }

    // 컬럼 읽기 (0-based index)
    int         getInt   (int col) { return sqlite3_column_int   (stmt_, col); }
    double      getDouble(int col) { return sqlite3_column_double (stmt_, col); }
    std::string getText  (int col) {
        auto* p = sqlite3_column_text(stmt_, col);
        return p ? reinterpret_cast<const char*>(p) : "";
    }
    bool isNull(int col) { return sqlite3_column_type(stmt_, col) == SQLITE_NULL; }

private:
    sqlite3_stmt* stmt_ = nullptr;
    void reset() { sqlite3_reset(stmt_); sqlite3_clear_bindings(stmt_); }
};

// ─────────────────────────────────────────
// Transaction : RAII 트랜잭션
// ─────────────────────────────────────────
class Transaction {
public:
    Transaction(sqlite3* db) : db_(db) { sqlite3_exec(db_, "BEGIN", nullptr, nullptr, nullptr); }
    ~Transaction() { if (!committed_) sqlite3_exec(db_, "ROLLBACK", nullptr, nullptr, nullptr); }

    void commit() {
        sqlite3_exec(db_, "COMMIT", nullptr, nullptr, nullptr);
        committed_ = true;
    }

private:
    sqlite3* db_;
    bool committed_ = false;
};

// ─────────────────────────────────────────
// Database : 연결 관리
// ─────────────────────────────────────────
class Database {
public:
    explicit Database(const std::string& path) {
        if (sqlite3_open(path.c_str(), &db_) != SQLITE_OK)
            throw std::runtime_error(sqlite3_errmsg(db_));
    }
    ~Database() { sqlite3_close(db_); }

    // 복사 금지, 이동만 허용
    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;

    Statement prepare(const std::string& sql) { return Statement(db_, sql); }
    Transaction beginTransaction()            { return Transaction(db_); }

    void exec(const std::string& sql) {
        char* err = nullptr;
        sqlite3_exec(db_, sql.c_str(), nullptr, nullptr, &err);
        if (err) { std::string msg(err); sqlite3_free(err); throw std::runtime_error(msg); }
    }

    sqlite3* handle() { return db_; }

private:
    sqlite3* db_ = nullptr;
};
