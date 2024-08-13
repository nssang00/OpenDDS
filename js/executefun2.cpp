#include <iostream>
#include <map>
#include <queue>
#include <functional>
#include <string>

class Character {
public:
    void printItems(int id, const std::string& message) {
        std::cout << "ID: " << id << ", Message: " << message << std::endl;
    }
};

class FunctionManager {
private:
    std::map<std::string, std::queue<std::function<void()>>> functionMap;

public:
    // 함수 추가
    void addFunction(const std::string& key, const std::function<void()>& func) {
        functionMap[key].push(func);
    }

    // 해당 키에 있는 모든 큐에서 함수 호출
    void callFunctions(const std::string& key) {
        auto it = functionMap.find(key);
        if (it != functionMap.end()) {
            while (!it->second.empty()) {
                auto func = it->second.front();
                it->second.pop();
                func(); // 함수 호출
            }
        } else {
            std::cout << "No functions found for key: " << key << std::endl;
        }
    }
};

int main() {
    Character character;
    FunctionManager manager;

    // std::bind를 사용하여 멤버 함수와 인자를 바인딩
    auto callback1 = std::bind(&Character::printItems, character, 1, "test1");
    auto callback2 = std::bind(&Character::printItems, character, 2, "test2");

    // 큐에 함수 추가
    manager.addFunction("key1", callback1);
    manager.addFunction("key1", callback2);

    // 함수 호출
    manager.callFunctions("key1");

    return 0;
}
