#include <iostream>
#include <string>

int main() {
    std::string path = "aaa/bbb/ccc/layer.json"; // 여기에 원하는 경로 입력

    size_t lastSlash = path.rfind('/');
    // 마지막 '/'가 있고, 그 뒤가 정확히 "layer.json"이면 처리
    if (lastSlash != std::string::npos && path.substr(lastSlash + 1) == "layer.json") {
        // "aaa/bbb/ccc" 부분
        std::string base = path.substr(0, lastSlash);

        // 최종 경로: "aaa/bbb/ccc.mbtiles"
        std::string result = base + ".mbtiles";

        // 상위 경로: "aaa/bbb" (없으면 빈 문자열)
        size_t secondLast = base.rfind('/');
        std::string parent = (secondLast == std::string::npos) ? "" : base.substr(0, secondLast);

        // 결과 출력 (원하는 형태로 변경 가능)
        std::cout << "상위 경로: " << (parent.empty() ? "(없음)" : parent) << std::endl;
        std::cout << "변환된 경로: " << result << std::endl;
    } else {
        std::cout << "입력이 '.../layer.json' 형식이 아닙니다." << std::endl;
    }

    return 0;
}
