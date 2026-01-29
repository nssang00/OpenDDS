#include <string>
#include <memory>
#include <utility>
#include <iostream>
#include <stdexcept>

Variant _ExecuteScriptAsync(const std::string& name, const VariantList& args);
void _ExecuteScriptWithoutResult(const std::string& name, const VariantList& args);

// ────────────────────────────────────────────────
[[nodiscard("Ignoring the return value will execute the script synchronously without returning a result")]]
class ScriptCall
{
public:
    explicit ScriptCall(std::string name, VariantList args)
        : name_(std::move(name)),
          args_(std::make_shared<VariantList>(std::move(args)))
    {}

    operator Variant()
    {
        if (!args_) {
            return Variant{};
        }

        auto local_args = std::move(*args_);
        args_.reset();

        try {
            return _ExecuteScriptAsync(name_, local_args);
        } catch (const std::exception& e) {
            std::cerr << "[ExecuteScript async] " << e.what() << std::endl;
            throw;
        } catch (...) {
            std::cerr << "[ExecuteScript async] Unknown exception" << std::endl;
            throw std::runtime_error("Unknown exception in async script");
        }
    }

    ~ScriptCall() noexcept
    {
        if (args_) {
            try {
                _ExecuteScriptWithoutResult(name_, *args_);
            } catch (const std::exception& e) {
                std::cerr << "[ExecuteScript sync (destructor)] " << e.what() << std::endl;
            } catch (...) {
                std::cerr << "[ExecuteScript sync (destructor)] Unknown exception\n";
            }
        }
    }

    ScriptCall(const ScriptCall&) = delete;
    ScriptCall& operator=(const ScriptCall&) = delete;
    ScriptCall(ScriptCall&&) noexcept = default;
    ScriptCall& operator=(ScriptCall&&) = delete;

private:
    std::string name_;
    std::shared_ptr<VariantList> args_;
};

// ────────────────────────────────────────────────
template<typename... Args>
ScriptCall ExecuteScript(const std::string& name, Args&&... args)
{
    return ScriptCall{
        name,
        VariantList{std::forward<Args>(args)...}  
    };
}

////////
Variant result = ExecuteScript("get_score", player_id, season);

ExecuteScript("play_effect", "explosion", position_x, position_y);

