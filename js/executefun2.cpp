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
    // 함수 추가 (std::make_pair 사용)
    void addFunction(const std::string& key, const std::function<void()>& func) {
        auto result = functionMap.insert(std::make_pair(key, std::queue<std::function<void()>>()));
        if (result.second) { // 새로 추가된 경우
            result.first->second.push(func);
        } else { // 이미 존재하는 경우
            result.first->second.push(func);
        }
    }

    // 해당 키에 있는 모든 큐에서 함수 호출 후 키 삭제
    void callFunctionsAndRemoveKey(const std::string& key) {
        auto it = functionMap.find(key);
        if (it != functionMap.end()) {
            while (!it->second.empty()) {
                auto func = it->second.front();
                it->second.pop();
                func(); // 함수 호출
            }
            functionMap.erase(it); // 키 삭제
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

    // 함수 호출 후 키 삭제
    manager.callFunctionsAndRemoveKey("key1");

    // 키가 삭제되었는지 확인
    manager.callFunctionsAndRemoveKey("key1"); // No functions found for key: key1

    return 0;
}
