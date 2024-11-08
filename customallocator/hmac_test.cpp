#include <openssl/hmac.h>
#include <iostream>
#include <iomanip>
#include <vector>
#include <string>

// 첫 번째 방식: 간단한 HMAC 함수 사용
std::vector<unsigned char> computeHMAC_SHA1_simple(const std::string& password, const unsigned char* data, size_t data_size) {
    unsigned char* digest = HMAC(EVP_sha1(), password.c_str(), static_cast<int>(password.size()), data, static_cast<int>(data_size), nullptr, nullptr);
    return std::vector<unsigned char>(digest, digest + SHA_DIGEST_LENGTH);
}

// 두 번째 방식: HMAC_CTX 사용
std::vector<unsigned char> computeHMAC_SHA1_CTX(const std::string& password, const unsigned char* data, size_t data_size) {
    unsigned int len = 0;
    std::vector<unsigned char> hmac_result(EVP_MAX_MD_SIZE);

    HMAC_CTX* ctx = HMAC_CTX_new();
    if (!ctx) {
        throw std::runtime_error("HMAC_CTX creation failed");
    }

    if (HMAC_Init_ex(ctx, password.c_str(), password.size(), EVP_sha1(), nullptr) != 1 ||
        HMAC_Update(ctx, data, data_size) != 1 ||
        HMAC_Final(ctx, hmac_result.data(), &len) != 1) {
        HMAC_CTX_free(ctx);
        throw std::runtime_error("HMAC computation failed");
    }

    HMAC_CTX_free(ctx);
    hmac_result.resize(len);
    return hmac_result;
}

// HMAC 결과를 16진수로 출력하는 유틸리티 함수
void printHex(const std::vector<unsigned char>& data) {
    for (unsigned char byte : data) {
        std::cout << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(byte);
    }
    std::cout << std::dec << std::endl;
}

int main() {
    const std::string password = "mysecret";
    const std::string message = "Hello, world!";
    const unsigned char* data = reinterpret_cast<const unsigned char*>(message.c_str());
    size_t data_size = message.size();

    try {
        // 첫 번째 방식 사용
        std::vector<unsigned char> hmac_simple = computeHMAC_SHA1_simple(password, data, data_size);
        std::cout << "HMAC (simple): ";
        printHex(hmac_simple);

        // 두 번째 방식 사용
        std::vector<unsigned char> hmac_ctx = computeHMAC_SHA1_CTX(password, data, data_size);
        std::cout << "HMAC (HMAC_CTX): ";
        printHex(hmac_ctx);

        // 결과 비교
        if (hmac_simple == hmac_ctx) {
            std::cout << "Both HMAC results match." << std::endl;
        } else {
            std::cout << "HMAC results do not match!" << std::endl;
        }
    } catch (const std::exception& e) {
        std::cerr << e.what() << std::endl;
    }

    return 0;
}
