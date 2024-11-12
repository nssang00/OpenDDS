@echo off
:: OpenSSL 경로 설정 (필요한 경우)
set OPENSSL_PATH=C:\OpenSSL-Win64\bin
set PATH=%OPENSSL_PATH%;%PATH%

:: Permissions CA에 사용할 비밀번호
set PASSWORD=core_1234

:: 1. Root CA 생성 제거

:: 2. Identity CA 생성
echo Creating Identity CA...
openssl genrsa -out identity_ca_private_key.pem 2048
openssl req -new -key identity_ca_private_key.pem -out identity_ca_cert.csr -subj "/CN=IdentityCA"
openssl x509 -req -in identity_ca_cert.csr -CA identity_ca_cert.pem -CAkey identity_ca_private_key.pem -CAcreateserial -out identity_ca_cert.pem -days 3650 -sha256
echo Identity CA created: identity_ca_private_key.pem, identity_ca_cert.pem

:: 3. Permissions CA 생성 (암호 설정)
echo Creating Permissions CA...
openssl genrsa -aes256 -passout pass:%PASSWORD% -out permissions_ca_private_key.pem 2048
openssl req -new -key permissions_ca_private_key.pem -passin pass:%PASSWORD% -out permissions_ca_cert.csr -subj "/CN=PermissionsCA"
openssl x509 -req -in permissions_ca_cert.csr -CA identity_ca_cert.pem -CAkey identity_ca_private_key.pem -CAcreateserial -out permissions_ca_cert.pem -days 3650 -sha256
echo Permissions CA created: permissions_ca_private_key.pem, permissions_ca_cert.pem

:: 4. governance.xml 및 permissions.xml에 서명 생성
echo Signing governance.xml and permissions.xml with permissions CA...
openssl smime -sign -in governance.xml -text -out signed_governance.p7s -signer permissions_ca_cert.pem -inkey permissions_ca_private_key.pem -passin pass:%PASSWORD%
openssl smime -sign -in permissions.xml -text -out signed_permissions.p7s -signer permissions_ca_cert.pem -inkey permissions_ca_private_key.pem -passin pass:%PASSWORD%
echo Signed files created: signed_governance.p7s, signed_permissions.p7s

:: 종료 메시지
echo All certificates, private keys, and signed XML files have been created.

:: 5. 인증서 검증
echo Verifying certificates...

:: Identity CA로 Identity CA 인증서 검증
openssl verify -CAfile identity_ca_cert.pem identity_ca_cert.pem

:: Identity CA로 Permissions CA 인증서 검증
openssl verify -CAfile identity_ca_cert.pem permissions_ca_cert.pem

pause
