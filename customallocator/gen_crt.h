@echo off
:: 배치 파일에서 OpenSSL 경로 설정 (필요한 경우)
set OPENSSL_PATH=C:\OpenSSL-Win64\bin
set PATH=%OPENSSL_PATH%;%PATH%

:: 1. Root CA 생성
echo Creating Root CA...
openssl genpkey -algorithm RSA -out rootCA.key -pkeyopt rsa_keygen_bits:4096
openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 3650 -out rootCA.crt -subj "/CN=RootCA"
echo Root CA created: rootCA.key, rootCA.crt

:: 2. Identity CA 생성
echo Creating Identity CA...
openssl genpkey -algorithm RSA -out identityCA.key -pkeyopt rsa_keygen_bits:4096
openssl req -new -key identityCA.key -out identityCA.csr -subj "/CN=IdentityCA"
openssl x509 -req -in identityCA.csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial -out identityCA.crt -days 3650 -sha256
echo Identity CA created: identityCA.key, identityCA.crt

:: 3. Permission CA 생성
echo Creating Permission CA...
openssl genpkey -algorithm RSA -out permissionCA.key -pkeyopt rsa_keygen_bits:4096
openssl req -new -key permissionCA.key -out permissionCA.csr -subj "/CN=PermissionCA"
openssl x509 -req -in permissionCA.csr -CA identityCA.crt -CAkey identityCA.key -CAcreateserial -out permissionCA.crt -days 3650 -sha256
echo Permission CA created: permissionCA.key, permissionCA.crt

:: 개인 키 생성
echo Creating private key for Identity and Permission CA...
openssl genpkey -algorithm RSA -out identity_private_key.key -pkeyopt rsa_keygen_bits:4096
openssl genpkey -algorithm RSA -out permission_private_key.key -pkeyopt rsa_keygen_bits:4096
echo Private keys created: identity_private_key.key, permission_private_key.key

:: 종료 메시지
echo All certificates and private keys have been created.
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
