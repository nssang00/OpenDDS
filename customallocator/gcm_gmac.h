#include <iostream>
#include <openssl/aes.h>
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <cstring>

enum EncryptionMode {
    AES_GCM,  // AES GCM (암호화 및 인증)
    AES_GMAC   // AES GMAC (인증만)
};

class AESHandler {
public:
    AESHandler(EncryptionMode mode) : mode_(mode) {}

    bool process(const unsigned char *key, const unsigned char *data, size_t data_len, unsigned char *output, size_t &output_len) {
        if (mode_ == AES_GCM) {
            return process_gcm(key, data, data_len, output, output_len);
        } else if (mode_ == AES_GMAC) {
            return process_gmac(key, data, data_len, output, output_len);
        }
        return false;
    }

private:
    EncryptionMode mode_;

    // AES-GCM 처리 (암호화 + 인증)
    bool process_gcm(const unsigned char *key, const unsigned char *data, size_t data_len, unsigned char *output, size_t &output_len) {
        EVP_CIPHER_CTX *ctx = EVP_CIPHER_CTX_new();
        if (!ctx) return false;

        unsigned char iv[12]; // GCM에서 사용되는 12바이트 IV
        RAND_bytes(iv, sizeof(iv)); // 랜덤 IV 생성

        if (1 != EVP_EncryptInit_ex(ctx, EVP_aes_256_gcm(), nullptr, key, iv)) {
            EVP_CIPHER_CTX_free(ctx);
            return false;
        }

        int len;
        // 암호화 수행
        if (1 != EVP_EncryptUpdate(ctx, output, &len, data, data_len)) {
            EVP_CIPHER_CTX_free(ctx);
            return false;
        }
        output_len = len;

        // 인증 태그를 생성
        unsigned char tag[16];
        if (1 != EVP_EncryptFinal_ex(ctx, output + len, &len)) {
            EVP_CIPHER_CTX_free(ctx);
            return false;
        }
        output_len += len;

        // GCM 모드에서 인증 태그를 얻음
        if (1 != EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, sizeof(tag), tag)) {
            EVP_CIPHER_CTX_free(ctx);
            return false;
        }

        // 인증 태그를 결과에 추가
        std::memcpy(output + output_len, tag, sizeof(tag));
        output_len += sizeof(tag);

        EVP_CIPHER_CTX_free(ctx);
        return true;
    }

    // AES-GMAC 처리 (인증만)
    bool process_gmac(const unsigned char *key, const unsigned char *data, size_t data_len, unsigned char *output, size_t &output_len) {
        EVP_CIPHER_CTX *ctx = EVP_CIPHER_CTX_new();
        if (!ctx) return false;

        unsigned char iv[12]; // GMAC에서 사용될 12바이트 IV
        RAND_bytes(iv, sizeof(iv)); // 랜덤 IV 생성

        if (1 != EVP_EncryptInit_ex(ctx, EVP_aes_256_gcm(), nullptr, key, iv)) {
            EVP_CIPHER_CTX_free(ctx);
            return false;
        }

        // 암호화 없이 데이터만 처리 (인증)
        if (1 != EVP_EncryptUpdate(ctx, nullptr, (int *)&output_len, data, data_len)) {
            EVP_CIPHER_CTX_free(ctx);
            return false;
        }

        unsigned char tag[16];
        if (1 != EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, sizeof(tag), tag)) {
            EVP_CIPHER_CTX_free(ctx);
            return false;
        }

        // GMAC은 인증 태그만 결과로 반환
        std::memcpy(output, tag, sizeof(tag));
        output_len = sizeof(tag);

        EVP_CIPHER_CTX_free(ctx);
        return true;
    }
};

int main() {
    // AES 키와 데이터 초기화
    unsigned char key[32];  // 256 비트 키
    RAND_bytes(key, sizeof(key));  // 랜덤 키 생성

    unsigned char data[] = "This is a test message for AES-GCM or GMAC!";
    size_t data_len = strlen((const char *)data);

    unsigned char output[1024];
    size_t output_len = 0;

    EncryptionMode mode = AES_GCM;  // GCM 또는 GMAC 모드를 선택합니다.
    AESHandler aes_handler(mode);

    if (aes_handler.process(key, data, data_len, output, output_len)) {
        std::cout << "Operation successful! Output length: " << output_len << std::endl;
        std::cout << "Output (hex): ";
        for (size_t i = 0; i < output_len; i++) {
            printf("%02x", output[i]);
        }
        std::cout << std::endl;
    } else {
        std::cout << "Operation failed!" << std::endl;
    }

    return 0;
}
