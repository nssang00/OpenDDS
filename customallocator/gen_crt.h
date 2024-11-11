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
