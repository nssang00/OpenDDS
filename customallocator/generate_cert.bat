@echo off
:: 배치 파일에서 OpenSSL 경로 설정 (필요한 경우)
set PATH="C:\Program Files\Git\usr\bin\";%PATH%

:: 설정할 비밀번호
set PASSWORD=core_1234

:: 1. Identity CA 생성
echo Creating Identity CA...
openssl genrsa -out identity_ca_private_key.pem 2048
::openssl req -config identity_ca_openssl.cnf -new -key identity_ca_private_key.pem -out identity_ca.csr
openssl req -new -key identity_ca_private_key.pem -out identity_ca.csr -subj "/C=KR/O=Hanwha Systems Inc./CN=Hanwha Systems (Identity CA)"
openssl x509 -req -days 3650 -in identity_ca.csr -signkey identity_ca_private_key.pem -out identity_ca_cert.pem

:: 2. Identity Certificate 생성
echo Creating Permissions CA...
openssl genrsa -passout pass:%PASSWORD% -out permissions_ca_private_key.pem 2048
::openssl req -config permissions_ca_openssl.cnf -new -key permissions_ca_private_key.pem -out permissions_ca.csr
openssl req -new -key permissions_ca_private_key.pem -passin pass:%PASSWORD% -out permissions_ca.csr -subj "/C=KR/O=Hanwha Systems Inc./CN=Hanwha Systems (Permissions CA)"
::openssl x509 -req -days 3650 -in  permissions_ca.csr -signkey permissions_ca_private_key.pem -out permissions_ca_cert.pem
openssl x509 -req -in permissions_ca.csr -CA identity_ca_cert.pem -CAkey identity_ca_private_key.pem -CAcreateserial -out permissions_ca_cert.pem -days 3650 -sha256


echo Creating Identity Certificate...
openssl genrsa -passout pass:%PASSWORD% -out smartdds_identity_private_key.pem 2048
::openssl req -config identity_ca_openssl.cnf -new -key smartdds_identity_private_key.pem -out smartdds_identity_ca.csr
openssl req -new -key smartdds_identity_private_key.pem -passin pass:%PASSWORD% -out smartdds_identity.csr -subj "/C=KR/O=Hanwha Systems Inc./CN=Hanwha Systems (Identity CA)"
::openssl x509 -req -days 3650 -in smartdds_identity.csr -signkey smartdds_identity_private_key.pem -out smartdds_identity_cert.pem
openssl x509 -req -in smartdds_identity.csr -CA identity_ca_cert.pem -CAkey identity_ca_private_key.pem -CAcreateserial -out smartdds_identity_cert.pem -days 3650 -sha256


:: 종료 메시지
echo All certificates, private keys, and signed XML files have been created.
pause

"C:\Program Files\Git\usr\bin\openssl.exe" verify -CAfile identity_ca_cert.pem smartdds_identity_cert.pem
