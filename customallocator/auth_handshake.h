#include <dds/dds.hpp>
#include <dds/security/SecurityPlugins.hpp>
#include <iostream>

using namespace dds::domain;
using namespace dds::security;

int main() {
    // Set up the domain participant
    int domain_id = 0;
    DomainParticipant participant(domain_id);

    // Initialize the authentication plugin and create an auth handle
    Authentication auth = Authentication::Default();  // Authentication plugin initialization
    AuthParticipantCryptoHandle auth_handle = auth->create_handle(participant);

    if (auth_handle == AuthParticipantCryptoHandle::invalid) {
        std::cerr << "Error creating authentication handle" << std::endl;
        return -1;
    }

    // Participant P1 initiates the handshake with Participant P2
    IdentityHandle p2_identity = ...; // Assume identity of P2 is available here

    AuthRequestHandle request_handle = auth->begin_handshake_request(auth_handle, p2_identity);
    if (request_handle == AuthRequestHandle::invalid) {
        std::cerr << "Failed to initiate handshake request" << std::endl;
        return -1;
    }

    // Simulate sending the HandshakeRequest to P2
    send_handshake_message(request_handle);

    // Participant P2 receives HandshakeRequest and validates it
    if (auth->validate_request(request_handle, p2_identity)) {
        AuthResponseHandle response_handle = auth->begin_handshake_reply(auth_handle, request_handle);

        // Simulate sending the HandshakeReply back to P1
        send_handshake_reply(response_handle);
    } else {
        std::cerr << "Handshake request validation failed" << std::endl;
        return -1;
    }

    // Participant P1 receives the HandshakeReply and validates it
    if (auth->validate_reply(response_handle)) {
        // Finalize the handshake
        if (auth->finalize_handshake(auth_handle)) {
            std::cout << "Mutual authentication successful. Secure communication established." << std::endl;
        } else {
            std::cerr << "Handshake finalization failed" << std::endl;
            return -1;
        }
    } else {
        std::cerr << "Handshake reply validation failed" << std::endl;
        return -1;
    }

    // Handle timeout and refresh the liveliness
    if (auth->is_authentication_timeout(auth_handle)) {
        auth->invalidate_handle(auth_handle); // Cleanup old auth state
        request_handle = auth->begin_handshake_request(auth_handle, p2_identity); // Retry if needed
        send_handshake_message(request_handle);
    }

    // Refresh P1's liveliness periodically to maintain the session
    while (participant.is_alive()) {
        auth->refresh_liveliness(auth_handle);
        std::this_thread::sleep_for(std::chrono::seconds(10)); // Adjust refresh interval as needed
    }

    return 0;
}

// Helper functions to simulate message sending (for example purposes)
void send_handshake_message(AuthRequestHandle request_handle) {
    // Code to send HandshakeRequest over the network to P2
    std::cout << "Sending HandshakeRequest to P2" << std::endl;
}

void send_handshake_reply(AuthResponseHandle response_handle) {
    // Code to send HandshakeReply back to P1
    std::cout << "Sending HandshakeReply to P1" << std::endl;
}
