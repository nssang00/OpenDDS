#include <iostream>
#include <winsock2.h>
#include <ws2tcpip.h>

#pragma comment(lib, "Ws2_32.lib")

const int BUFFER_SIZE = 1024; // 1KB

int main() {
    WSADATA wsaData;
    SOCKET udpSocket;
    sockaddr_in serverAddr, clientAddr;
    int clientAddrLen = sizeof(clientAddr);
    char buffer[BUFFER_SIZE];

    // Winsock 초기화
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        std::cerr << "WSAStartup failed" << std::endl;
        return 1;
    }

    // 소켓 생성
    udpSocket = socket(AF_INET, SOCK_DGRAM, 0);
    if (udpSocket == INVALID_SOCKET) {
        std::cerr << "Socket creation failed" << std::endl;
        WSACleanup();
        return 1;
    }

    // 서버 주소 설정
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(8888); // 포트 번호
    serverAddr.sin_addr.s_addr = INADDR_ANY; // 모든 인터페이스에서 수신

    // 바인드
    if (bind(udpSocket, (sockaddr*)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR) {
        std::cerr << "Bind failed" << std::endl;
        closesocket(udpSocket);
        WSACleanup();
        return 1;
    }

    std::cout << "Receiver is waiting for packets..." << std::endl;

    for (int round = 0; round < 10; ++round) {
        int packetCount = 0;

        // 10,000 패킷 수신
        while (packetCount < TOTAL_PACKETS) {
            int bytesReceived = recvfrom(udpSocket, buffer, BUFFER_SIZE, 0,
                                         (sockaddr*)&clientAddr, &clientAddrLen);
            if (bytesReceived == SOCKET_ERROR) {
                std::cerr << "recvfrom failed" << std::endl;
                break;
            }
            packetCount++;
        }

        // PONG 메시지 전송
        const char* pongMessage = "PONG";
        sendto(udpSocket, pongMessage, strlen(pongMessage), 0,
               (sockaddr*)&clientAddr, clientAddrLen);
    }

    std::cout << "Receiver finished receiving packets." << std::endl;

    // 소켓 종료
    closesocket(udpSocket);
    WSACleanup();
    return 0;
}
