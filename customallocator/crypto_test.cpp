#include <openssl/evp.h>
#include <openssl/rand.h>
#include <iostream>
#include <vector>
#include <iomanip>

bool aesGmacSign(const std::string &message, const std::vector<unsigned char> &key, std::vector<unsigned char> &tag, std::vector<unsigned char> &iv) {
    EVP_CIPHER_CTX *ctx = EVP_CIPHER_CTX_new();
    if (!ctx) return false;

    // IV (Nonce) 생성 (12바이트)
    iv.resize(12);
    if (!RAND_bytes(iv.data(), iv.size())) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    if (EVP_EncryptInit_ex(ctx, EVP_aes_128_gcm(), NULL, NULL, NULL) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    // 키와 IV 설정
    if (EVP_EncryptInit_ex(ctx, NULL, NULL, key.data(), iv.data()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    // 메시지를 통해 인증 태그 생성
    int len;
    if (EVP_EncryptUpdate(ctx, NULL, &len, reinterpret_cast<const unsigned char *>(message.c_str()), message.size()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    // 태그 추출 (16바이트)
    tag.resize(16);
    if (EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, tag.size(), tag.data()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    EVP_CIPHER_CTX_free(ctx);
    return true;
}

bool aesGcmEncrypt(const std::string &plaintext, const std::vector<unsigned char> &key, std::vector<unsigned char> &ciphertext, std::vector<unsigned char> &tag, std::vector<unsigned char> &iv) {
    EVP_CIPHER_CTX *ctx = EVP_CIPHER_CTX_new();
    if (!ctx) return false;

    // IV (Nonce) 생성 (12바이트)
    iv.resize(12);
    if (!RAND_bytes(iv.data(), iv.size())) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    if (EVP_EncryptInit_ex(ctx, EVP_aes_128_gcm(), NULL, NULL, NULL) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    // 키와 IV 설정
    if (EVP_EncryptInit_ex(ctx, NULL, NULL, key.data(), iv.data()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    // 메시지 암호화
    ciphertext.resize(plaintext.size() + EVP_CIPHER_block_size(EVP_aes_128_gcm()));
    int len = 0, ciphertext_len = 0;
    if (EVP_EncryptUpdate(ctx, ciphertext.data(), &len, reinterpret_cast<const unsigned char *>(plaintext.c_str()), plaintext.size()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }
    ciphertext_len = len;

    if (EVP_EncryptFinal_ex(ctx, ciphertext.data() + len, &len) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }
    ciphertext_len += len;
    ciphertext.resize(ciphertext_len);

    // 태그 생성 (16바이트)
    tag.resize(16);
    if (EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, tag.size(), tag.data()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    EVP_CIPHER_CTX_free(ctx);
    return true;
}

int main() {
    std::string message = "Hello, GMAC and GCM!";
    std::vector<unsigned char> key(16); // 128비트 AES 키
    RAND_bytes(key.data(), key.size());

    // SIGN 방식 테스트 (AES-128-GMAC)
    std::vector<unsigned char> gmac_tag, gmac_iv;
    if (aesGmacSign(message, key, gmac_tag, gmac_iv)) {
        std::cout << "GMAC Tag: ";
        for (auto byte : gmac_tag)
            std::cout << std::hex << std::setw(2) << std::setfill('0') << (int)byte;
        std::cout << "\nGMAC IV: ";
        for (auto byte : gmac_iv)
            std::cout << std::hex << std::setw(2) << std::setfill('0') << (int)byte;
        std::cout << std::endl;
    } else {
        std::cerr << "GMAC Tag generation failed." << std::endl;
    }

    // ENCRYPT 방식 테스트 (AES-128-GCM)
    std::vector<unsigned char> gcm_ciphertext, gcm_tag, gcm_iv;
    if (aesGcmEncrypt(message, key, gcm_ciphertext, gcm_tag, gcm_iv)) {
        std::cout << "\nCiphertext: ";
        for (auto byte : gcm_ciphertext)
            std::cout << std::hex << std::setw(2) << std::setfill('0') << (int)byte;
        std::cout << "\nGCM Tag: ";
        for (auto byte : gcm_tag)
            std::cout << std::hex << std::setw(2) << std::setfill('0') << (int)byte;
        std::cout << "\nGCM IV: ";
        for (auto byte : gcm_iv)
            std::cout << std::hex << std::setw(2) << std::setfill('0') << (int)byte;
        std::cout << std::endl;
    } else {
        std::cerr << "Encryption failed." << std::endl;
    }

    return 0;
}
