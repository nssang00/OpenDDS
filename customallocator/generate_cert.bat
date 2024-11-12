@echo off
:: OpenSSL 경로 설정 (필요한 경우)
set OPENSSL_PATH=C:\OpenSSL-Win64\bin
set PATH=%OPENSSL_PATH%;%PATH%

:: Permissions CA에 사용할 비밀번호
set PASSWORD=core_1234

:: 1. Root CA 생성
echo Creating Root CA...
openssl genrsa -out rootCA.key 2048
openssl req -x509 -new -key rootCA.key -sha256 -days 3650 -out rootCA.crt -subj "/CN=RootCA"
echo Root CA created: rootCA.key, rootCA.crt

:: 2. Identity CA 생성
echo Creating Identity CA...
openssl genrsa -out identityCA.key 2048
openssl req -new -key identityCA.key -out identityCA.csr -subj "/CN=IdentityCA"
openssl x509 -req -in identityCA.csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial -out identityCA.crt -days 3650 -sha256
echo Identity CA created: identityCA.key, identityCA.crt

:: 3. Permissions CA 생성 (암호 설정)
echo Creating Permissions CA...
openssl genrsa -aes256 -passout pass:%PASSWORD% -out permissionsCA.key 2048
openssl req -new -key permissionsCA.key -passin pass:%PASSWORD% -out permissionsCA.csr -subj "/CN=PermissionsCA"
openssl x509 -req -in permissionsCA.csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial -out permissionsCA.crt -days 3650 -sha256
echo Permissions CA created: permissionsCA.key, permissionsCA.crt

:: 4. governance.xml 및 permissions.xml에 서명 생성
echo Signing governance.xml and permissions.xml with permissions CA...
openssl smime -sign -in governance.xml -text -out signed_governance.p7s -signer permissionsCA.crt -inkey permissionsCA.key -passin pass:%PASSWORD%
openssl smime -sign -in permissions.xml -text -out signed_permissions.p7s -signer permissionsCA.crt -inkey permissionsCA.key -passin pass:%PASSWORD%
echo Signed files created: signed_governance.p7s, signed_permissions.p7s

:: 종료 메시지
echo All certificates, private keys, and signed XML files have been created.
pause
