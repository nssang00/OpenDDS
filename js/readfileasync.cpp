#include <iostream>
#include <fstream>
#include <string>
#include <future>
#include <functional>

void readFileAsync(const std::string& filename, std::function<void(const std::string&, const std::string&)> callback) {
    // 비동기적으로 파일 읽기
    auto future = std::async(std::launch::async, [filename]() {
        std::ifstream file(filename);
        if (!file.is_open()) {
            return std::string("Error: Could not open file.");
        }

        std::string content((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
        return content;
    });

    // 작업이 완료되면 콜백 호출
    future.wait(); // 파일 읽기가 완료될 때까지 대기
    std::string result = future.get();
    if (result == "Error: Could not open file.") {
        callback(result, "");
    } else {
        callback("", result);
    }
}

int main() {
    // 콜백 함수 정의
    auto callback = [](const std::string& err, const std::string& data) {
        if (!err.empty()) {
            std::cerr << err << std::endl;
        } else {
            std::cout << "파일 내용: " << data << std::endl;
        }
    };

    // 비동기 파일 읽기 시작
    readFileAsync("example.txt", callback);

    std::cout << "파일 읽기 요청이 비동기적으로 시작되었습니다." << std::endl;

    return 0;
}
