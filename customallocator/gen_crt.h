@echo off

set OPENSSL_CONF=C:\Program Files\OpenSSL-Win64\bin\openssl.cfg

:: 루트 CA 생성 (rootCA.key 및 rootCA.crt)
echo Generating Root CA...
openssl genpkey -algorithm RSA -out rootCA.key -aes256 -pass pass:core_1234
openssl req -key rootCA.key -new -x509 -out rootCA.crt -passin pass:core_1234 -subj "/C=US/ST=California/L=San Francisco/O=MyCompany/CN=RootCA"

:: Identity CA 인증서 생성 (identityCA.key 및 identityCA.crt)
echo Generating Identity CA...
openssl genpkey -algorithm RSA -out identityCA.key -aes256 -pass pass:core_1234
openssl req -key identityCA.key -new -x509 -out identityCA.crt -passin pass:core_1234 -subj "/C=US/ST=California/L=San Francisco/O=MyCompany/CN=IdentityCA"

:: 개인 키 및 개인 인증서 생성 (identity_private_key.key 및 identity_certificate.crt)
echo Generating Identity Certificate...
openssl genpkey -algorithm RSA -out identity_private_key.key -aes256 -pass pass:core_1234
openssl req -key identity_private_key.key -new -out identity_request.csr -passin pass:core_1234 -subj "/C=US/ST=California/L=San Francisco/O=MyCompany/CN=Identity"
openssl x509 -req -in identity_request.csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial -out identity_certificate.crt -passin pass:core_1234

:: 완료 메시지
echo All certificates and keys have been generated.

pause

////////////////////////
<dds>
    <security>
        <security_plugins>
            <plugin name="openssl">
                <!-- Identity CA 인증서 -->
                <identity_ca>path/to/rootCA.crt</identity_ca>

                <!-- Permission CA 인증서 -->
                <permissions_ca>path/to/identityCA.crt</permissions_ca>

                <!-- Identity 인증서 -->
                <identity_certificate>path/to/identity_certificate.crt</identity_certificate>

                <!-- Identity 개인 키 -->
                <private_key>path/to/identity_private_key.key</private_key>

                <!-- 개인 키 비밀번호 (필요한 경우) -->
                <password>core_1234</password>
            </plugin>
        </security_plugins>

        <!-- 보안 QoS 설정 -->
        <security_qos>
            <encrypt_data>true</encrypt_data>
            <auth_method>PLUGIN_AUTHENTICATION</auth_method>
            <message_integrity>true</message_integrity>
        </security_qos>
    </security>
</dds>
    
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
