@echo off
set PATH=C:\OpenSSL-Win64\bin;%PATH%
echo Generating Root CA...

:: Step 1: 루트 CA 생성
openssl genpkey -algorithm RSA -out rootCA.key -pkeyopt rsa_keygen_bits:4096
openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 3650 -out rootCA.crt -subj "/CN=RootCA"

echo Root CA created: rootCA.key, rootCA.crt
echo.

echo Generating Identity CA...

:: Step 2: Identity CA 생성
openssl genpkey -algorithm RSA -out identityCA.key -pkeyopt rsa_keygen_bits:4096
openssl req -new -key identityCA.key -out identityCA.csr -subj "/CN=IdentityCA"
openssl x509 -req -in identityCA.csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial -out identityCA.crt -days 3650 -sha256

echo Identity CA created: identityCA.key, identityCA.crt
echo.

echo Generating Client Private Key...

:: Step 3: 클라이언트 개인 키 생성 (암호화된 상태로)
openssl genpkey -algorithm RSA -aes256 -pass pass:core_1234 -out client.key -pkeyopt rsa_keygen_bits:4096

echo Client private key created: client.key (password: core_1234)
echo.

echo Generating Client Certificate...

:: Step 4: 클라이언트 인증서 생성
openssl req -new -key client.key -passin pass:core_1234 -out client.csr -subj "/CN=Client"
openssl x509 -req -in client.csr -CA identityCA.crt -CAkey identityCA.key -CAcreateserial -out client.crt -days 3650 -sha256

echo Client certificate created: client.crt
echo.

echo The following files were generated:
echo 1. Root CA: rootCA.crt, rootCA.key
echo 2. Identity CA: identityCA.crt, identityCA.key
echo 3. Client Certificate: client.crt
echo 4. Client Private Key: client.key (password: core_1234)
pause



#include <dds/dds.hpp>

int main() {
    dds::domain::DomainParticipant participant(0);
    participant.qos().policy(dds::core::policy::Property({
        {"dds.sec.auth.identity_ca", "file:path/to/identityCA.crt"},
        {"dds.sec.auth.identity_certificate", "file:path/to/client.crt"},
        {"dds.sec.auth.private_key", "file:path/to/client.key"},
        {"dds.sec.auth.private_key_password", "core_1234"}
    }));
}
