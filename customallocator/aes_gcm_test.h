#include <openssl/evp.h>
#include <openssl/rand.h>
#include <iostream>
#include <vector>
#include <chrono>

bool aes_256_gcm_encrypt(EVP_CIPHER_CTX* ctx, const std::vector<unsigned char>& plaintext,
                         const std::vector<unsigned char>& key,
                         const std::vector<unsigned char>& iv,
                         const std::vector<unsigned char>& aad,
                         std::vector<unsigned char>& ciphertext,
                         std::vector<unsigned char>& tag,
                         bool reuse_ctx = false) {
    int len = 0;

    // 컨텍스트 재사용 시 초기화
    if (reuse_ctx) {
        EVP_CIPHER_CTX_reset(ctx);
    }

    // 새로운 암호화 시작 (컨텍스트 초기화)
    if (EVP_EncryptInit_ex(ctx, EVP_aes_256_gcm(), nullptr, nullptr, nullptr) != 1) {
        return false;
    }

    if (EVP_EncryptInit_ex(ctx, nullptr, nullptr, key.data(), iv.data()) != 1) {
        return false;
    }

    // AAD 추가
    if (!aad.empty()) {
        if (EVP_EncryptUpdate(ctx, nullptr, &len, aad.data(), aad.size()) != 1) {
            return false;
        }
    }

    // 암호화
    ciphertext.resize(plaintext.size());
    if (EVP_EncryptUpdate(ctx, ciphertext.data(), &len, plaintext.data(), plaintext.size()) != 1) {
        return false;
    }
    int ciphertext_len = len;

    if (EVP_EncryptFinal_ex(ctx, ciphertext.data() + len, &len) != 1) {
        return false;
    }
    ciphertext_len += len;
    ciphertext.resize(ciphertext_len);

    // 태그 생성
    tag.resize(16);
    if (EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, tag.size(), tag.data()) != 1) {
        return false;
    }

    return true;
}

void benchmark(bool reuse_ctx) {
    const int test_count = 10000;
    std::vector<unsigned char> key(32);
    std::vector<unsigned char> iv(12);
    std::vector<unsigned char> aad = { 0x01, 0x02, 0x03, 0x04 };
    std::vector<unsigned char> plaintext(1000, 'A'); // 1000바이트 크기의 평문 데이터
    std::vector<unsigned char> ciphertext;
    std::vector<unsigned char> tag;

    RAND_bytes(key.data(), key.size());
    RAND_bytes(iv.data(), iv.size());

    EVP_CIPHER_CTX* ctx = nullptr;
    if (reuse_ctx) {
        ctx = EVP_CIPHER_CTX_new();
        if (!ctx) {
            std::cerr << "Failed to create EVP_CIPHER_CTX" << std::endl;
            return;
        }
    }

    auto start_time = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < test_count; ++i) {
        if (!reuse_ctx) {
            ctx = EVP_CIPHER_CTX_new();
            if (!ctx) {
                std::cerr << "Failed to create EVP_CIPHER_CTX" << std::endl;
                return;
            }
        }

        if (!aes_256_gcm_encrypt(ctx, plaintext, key, iv, aad, ciphertext, tag, reuse_ctx)) {
            std::cerr << "Encryption failed on iteration " << i << std::endl;
            if (!reuse_ctx) {
                EVP_CIPHER_CTX_free(ctx);
            }
            return;
        }

        if (!reuse_ctx) {
            EVP_CIPHER_CTX_free(ctx);
        }
    }

    auto end_time = std::chrono::high_resolution_clock::now();
    auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time);

    if (reuse_ctx) {
        EVP_CIPHER_CTX_free(ctx);
    }

    std::cout << (reuse_ctx ? "Reusing EVP_CIPHER_CTX" : "Creating new EVP_CIPHER_CTX each time")
              << " took " << elapsed.count() << " ms for " << test_count << " encryptions." << std::endl;
}

int main() {
    std::cout << "AES-256-GCM Encryption Performance Test" << std::endl;

    // 테스트 1: 매번 새로 EVP_CIPHER_CTX 생성
    benchmark(false);

    // 테스트 2: EVP_CIPHER_CTX 재사용
    benchmark(true);

    return 0;
}
