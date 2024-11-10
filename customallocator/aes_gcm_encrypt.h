#include <openssl/evp.h>
#include <openssl/rand.h>
#include <iostream>
#include <vector>

// Encrypt function
bool aes_gcm_encrypt(const std::vector<unsigned char>& key, // K: The encryption key
                     const std::vector<unsigned char>& iv,  // IV: Initialization Vector (96-bit)
                     const std::vector<unsigned char>& plaintext, // P: Plaintext to encrypt
                     const std::vector<unsigned char>& aad, // AAD: Additional Authenticated Data
                     std::vector<unsigned char>& ciphertext, // C: Output ciphertext
                     std::vector<unsigned char>& tag) { // T: Authentication tag

    // Create and initialize the context
    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx) return false;

    // Select AES-GCM mode based on key size (128-bit or 256-bit key)
    const EVP_CIPHER* cipher = (key.size() == 16) ? EVP_aes_128_gcm() : EVP_aes_256_gcm();

    // Initialize encryption operation
    if (EVP_EncryptInit_ex(ctx, cipher, nullptr, nullptr, nullptr) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    // Set the IV length
    if (EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, iv.size(), nullptr) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    // Initialize key and IV
    if (EVP_EncryptInit_ex(ctx, nullptr, nullptr, key.data(), iv.data()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    int len;
    // Provide AAD (if available) for authentication
    if (!aad.empty() && EVP_EncryptUpdate(ctx, nullptr, &len, aad.data(), aad.size()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    // Encrypt plaintext (P), resulting in ciphertext (C)
    ciphertext.resize(plaintext.size());
    if (EVP_EncryptUpdate(ctx, ciphertext.data(), &len, plaintext.data(), plaintext.size()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }
    int ciphertext_len = len;

    // Finalize encryption
    if (EVP_EncryptFinal_ex(ctx, ciphertext.data() + len, &len) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }
    ciphertext_len += len;
    ciphertext.resize(ciphertext_len);

    // Get the authentication tag (T)
    tag.resize(16);
    if (EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, tag.size(), tag.data()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    // Clean up
    EVP_CIPHER_CTX_free(ctx);
    return true;
}

// Decrypt function
bool aes_gcm_decrypt(const std::vector<unsigned char>& key, // K: The encryption key
                     const std::vector<unsigned char>& iv,  // IV: Initialization Vector (96-bit)
                     const std::vector<unsigned char>& ciphertext, // C: Ciphertext to decrypt
                     const std::vector<unsigned char>& aad, // AAD: Additional Authenticated Data
                     const std::vector<unsigned char>& tag, // T: Authentication tag
                     std::vector<unsigned char>& plaintext) { // P: Output plaintext after decryption

    // Create and initialize the context
    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx) return false;

    // Select AES-GCM mode based on key size (128-bit or 256-bit key)
    const EVP_CIPHER* cipher = (key.size() == 16) ? EVP_aes_128_gcm() : EVP_aes_256_gcm();

    // Initialize decryption operation
    if (EVP_DecryptInit_ex(ctx, cipher, nullptr, nullptr, nullptr) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    // Set the IV length
    if (EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, iv.size(), nullptr) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    // Initialize key and IV
    if (EVP_DecryptInit_ex(ctx, nullptr, nullptr, key.data(), iv.data()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    int len;
    // Provide AAD (if available) for authentication
    if (!aad.empty() && EVP_DecryptUpdate(ctx, nullptr, &len, aad.data(), aad.size()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    // Decrypt ciphertext (C), resulting in plaintext (P)
    plaintext.resize(ciphertext.size());
    if (EVP_DecryptUpdate(ctx, plaintext.data(), &len, ciphertext.data(), ciphertext.size()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }
    int plaintext_len = len;

    // Set the authentication tag (T) and finalize decryption
    if (EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_TAG, tag.size(), (void*)tag.data()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    // Verify the tag and finalize decryption
    if (EVP_DecryptFinal_ex(ctx, plaintext.data() + len, &len) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }
    plaintext_len += len;
    plaintext.resize(plaintext_len);

    // Clean up
    EVP_CIPHER_CTX_free(ctx);
    return true;
}

int main() {
    std::vector<unsigned char> key(16);  // K: Use 16 bytes for AES-128 or 32 bytes for AES-256
    RAND_bytes(key.data(), key.size());

    std::vector<unsigned char> iv(12);  // IV: 96-bit Initialization Vector
    RAND_bytes(iv.data(), iv.size());

    std::string plaintext = "Hello, this is a test message for AES-GCM encryption!";
    std::vector<unsigned char> pt(plaintext.begin(), plaintext.end()); // P: Plaintext

    std::string aad_str = "Additional Authenticated Data";
    std::vector<unsigned char> aad(aad_str.begin(), aad_str.end()); // AAD: Additional Authenticated Data

    std::vector<unsigned char> ciphertext, tag;

    // Encrypt
    if (aes_gcm_encrypt(key, iv, pt, aad, ciphertext, tag)) {
        std::cout << "Encryption successful!" << std::endl;
    } else {
        std::cout << "Encryption failed." << std::endl;
        return 1;
    }

    // Decrypt
    std::vector<unsigned char> decrypted_text;
    if (aes_gcm_decrypt(key, iv, ciphertext, aad, tag, decrypted_text)) {
        std::cout << "Decryption successful!" << std::endl;
        std::cout << "Decrypted text: " << std::string(decrypted_text.begin(), decrypted_text.end()) << std::endl;
    } else {
        std::cout << "Decryption failed. Authentication tag did not match." << std::endl;
    }

    return 0;
}
