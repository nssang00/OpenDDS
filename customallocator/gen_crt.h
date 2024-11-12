@echo off
:: OpenSSL 경로 설정 (필요한 경우)
set OPENSSL_PATH=C:\OpenSSL-Win64\bin
set PATH=%OPENSSL_PATH%;%PATH%

:: 설정할 비밀번호
set PASSWORD=core_1234

:: 1. Root CA 생성
echo Creating Root CA...
openssl genpkey -algorithm RSA -out rootCA.key -pkeyopt rsa_keygen_bits:4096
openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 3650 -out rootCA.crt -subj "/CN=RootCA"
echo Root CA created: rootCA.key, rootCA.crt

:: 2. Identity CA 생성
echo Creating Identity CA...
openssl genpkey -algorithm RSA -aes256 -pass pass:%PASSWORD% -out identityCA.key -pkeyopt rsa_keygen_bits:4096
openssl req -new -key identityCA.key -passin pass:%PASSWORD% -out identityCA.csr -subj "/CN=IdentityCA"
openssl x509 -req -in identityCA.csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial -out identityCA.crt -days 3650 -sha256
echo Identity CA created: identityCA.key, identityCA.crt

:: 3. Permissions CA 생성
echo Creating Permissions CA...
openssl genpkey -algorithm RSA -aes256 -pass pass:%PASSWORD% -out permissionsCA.key -pkeyopt rsa_keygen_bits:4096
openssl req -new -key permissionsCA.key -passin pass:%PASSWORD% -out permissionsCA.csr -subj "/CN=PermissionsCA"
openssl x509 -req -in permissionsCA.csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial -out permissionsCA.crt -days 3650 -sha256
echo Permissions CA created: permissionsCA.key, permissionsCA.crt

:: 4. Identity와 Permission용 개인 키 생성
echo Creating private key for Identity...
openssl genpkey -algorithm RSA -aes256 -pass pass:%PASSWORD% -out identity_private_key.key -pkeyopt rsa_keygen_bits:4096
echo Creating private key for Permission...
openssl genpkey -algorithm RSA -aes256 -pass pass:%PASSWORD% -out permission_private_key.key -pkeyopt rsa_keygen_bits:4096
echo Private keys created: identity_private_key.key, permission_private_key.key

:: 5. governance.xml 및 permissions.xml에 서명 생성
echo Signing governance.xml and permissions.xml with permissions CA...
openssl smime -sign -in governance.xml -text -out signed_governance.p7s -signer permissionsCA.crt -inkey permissionsCA.key -passin pass:%PASSWORD%
openssl smime -sign -in permissions.xml -text -out signed_permissions.p7s -signer permissionsCA.crt -inkey permissionsCA.key -passin pass:%PASSWORD%
echo Signed files created: signed_governance.p7s, signed_permissions.p7s

:: 종료 메시지
echo All certificates, private keys, and signed XML files have been created.
pause
////////////////////////
<dds>
    <security>
        <security_plugins>
            <plugin name="openssl">
                <!-- Identity CA 인증서 (엔터티의 신원 확인) -->
                <identity_ca>path/to/identityCA.crt</identity_ca>

                <!-- Permissions CA 인증서 (엔터티의 권한 확인) -->
                <permissions_ca>path/to/permissionsCA.crt</permissions_ca>

                <!-- 엔터티의 개인 키 -->
                <private_key>path/to/identity_private_key.key</private_key>

                <!-- 엔터티의 ID 인증서 -->
                <identity_certificate>path/to/identityCA.crt</identity_certificate>
            </plugin>
        </security_plugins>
    </security>
</dds>
