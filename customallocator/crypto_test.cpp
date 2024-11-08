#include <openssl/evp.h>
#include <openssl/rand.h>
#include <openssl/hmac.h>
#include <iostream>
#include <iomanip>
#include <vector>
#include <string>

// 랜덤 키 생성 함수
std::vector<unsigned char> generateRandomKey(int length) {
    std::vector<unsigned char> key(length);
    RAND_bytes(key.data(), length);
    return key;
}

// HMAC-SHA256 계산 함수
std::vector<unsigned char> computeHMAC(const std::vector<unsigned char> &data, const std::vector<unsigned char> &key) {
    unsigned int len = EVP_MAX_MD_SIZE;
    std::vector<unsigned char> hmac(len);

    HMAC(EVP_sha256(), key.data(), key.size(), data.data(), data.size(), hmac.data(), &len);

    hmac.resize(len); // 실제 길이에 맞게 자르기
    return hmac;
}

// SIGN 모드: AES-GMAC 방식 (HMAC 대신 AES-GMAC을 사용)
std::vector<unsigned char> signWithAES_GMAC(const std::vector<unsigned char> &data, const std::vector<unsigned char> &key, const std::vector<unsigned char> &iv) {
    EVP_CIPHER_CTX *ctx = EVP_CIPHER_CTX_new();
    std::vector<unsigned char> tag(16);  // GMAC 태그는 16바이트

    EVP_EncryptInit_ex(ctx, EVP_aes_128_gcm(), nullptr, nullptr, nullptr);
    EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, iv.size(), nullptr);
    EVP_EncryptInit_ex(ctx, nullptr, nullptr, key.data(), iv.data());

    int len;
    EVP_EncryptUpdate(ctx, nullptr, &len, data.data(), data.size());
    EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, tag.size(), tag.data());
    EVP_CIPHER_CTX_free(ctx);

    return tag;
}

// ENCRYPT 모드: AES-GCM (HMAC을 데이터에 추가)
std::vector<unsigned char> encryptWithAES_GCM(const std::vector<unsigned char> &data, const std::vector<unsigned char> &key, const std::vector<unsigned char> &iv) {
    EVP_CIPHER_CTX *ctx = EVP_CIPHER_CTX_new();
    std::vector<unsigned char> ciphertext(data.size());
    std::vector<unsigned char> tag(16);  // GCM의 태그는 16바이트

    EVP_EncryptInit_ex(ctx, EVP_aes_128_gcm(), nullptr, nullptr, nullptr);
    EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, iv.size(), nullptr);
    EVP_EncryptInit_ex(ctx, nullptr, nullptr, key.data(), iv.data());

    int len;
    EVP_EncryptUpdate(ctx, ciphertext.data(), &len, data.data(), data.size());
    EVP_EncryptFinal_ex(ctx, ciphertext.data() + len, &len);

    EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, tag.size(), tag.data());
    ciphertext.insert(ciphertext.end(), tag.begin(), tag.end()); // 태그를 암호문에 추가

    EVP_CIPHER_CTX_free(ctx);
    return ciphertext;
}

// HMAC을 추가하여 출력
void printHMAC(const std::vector<unsigned char> &hmac, const std::string &label) {
    std::cout << label << ": ";
    for (const auto &byte : hmac) {
        std::cout << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(byte);
    }
    std::cout << std::endl;
}

// 결과를 출력하는 함수
void printHex(const std::vector<unsigned char> &data, const std::string &label) {
    std::cout << label << ": ";
    for (const auto &byte : data) {
        std::cout << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(byte);
    }
    std::cout << std::endl;
}

int main() {
    std::string text = "Hello, DDS Security!";
    std::vector<unsigned char> data(text.begin(), text.end());

    std::vector<unsigned char> key = generateRandomKey(16);  // AES-128의 경우 16바이트 키
    std::vector<unsigned char> iv(12);  // GCM 모드에서 일반적으로 12바이트 IV 사용
    RAND_bytes(iv.data(), iv.size());

    // SIGN 모드: AES-GMAC (HMAC을 대신하는 역할)
    std::vector<unsigned char> tag = signWithAES_GMAC(data, key, iv);
    printHex(tag, "SIGN (AES-GMAC) Tag");

    // HMAC을 사용하여 SIGN 결과에 대한 인증 태그 추가
    std::vector<unsigned char> hmacForSign = computeHMAC(tag, key);
    printHMAC(hmacForSign, "HMAC for SIGN");

    // ENCRYPT 모드: AES-GCM (HMAC을 추가한 암호문)
    std::vector<unsigned char> ciphertext = encryptWithAES_GCM(data, key, iv);
    printHex(ciphertext, "ENCRYPT (AES-GCM) Ciphertext with Tag");

    // HMAC을 사용하여 ENCRYPT 결과에 대한 인증 태그 추가
    std::vector<unsigned char> hmacForEncrypt = computeHMAC(ciphertext, key);
    printHMAC(hmacForEncrypt, "HMAC for ENCRYPT");

    return 0;
}
