#include <iostream>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <cstring>
#include <chrono>

#pragma comment(lib, "Ws2_32.lib")

const int BUFFER_SIZE = 1024; // 1KB
const int TOTAL_PACKETS = 10000;
const int NUM_ROUNDS = 10;

int main() {
    WSADATA wsaData;
    SOCKET udpSocket;
    sockaddr_in serverAddr;

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
    serverAddr.sin_addr.s_addr = inet_addr("127.0.0.1"); // 루프백 주소

    char buffer[BUFFER_SIZE];
    memset(buffer, 'A', sizeof(buffer)); // 데이터 초기화 (1KB)

    for (int round = 0; round < NUM_ROUNDS; ++round) {
        auto start = std::chrono::high_resolution_clock::now();

        // 10,000 패킷 전송
        for (int i = 0; i < TOTAL_PACKETS; ++i) {
            int bytesSent = sendto(udpSocket, buffer, BUFFER_SIZE, 0,
                                   (sockaddr*)&serverAddr, sizeof(serverAddr));
            if (bytesSent == SOCKET_ERROR) {
                std::cerr << "sendto failed" << std::endl;
                break;
            }
        }

        // PONG 메시지 수신 대기
        char pongMessage[5];
        sockaddr_in fromAddr;
        int fromAddrLen = sizeof(fromAddr);
        int bytesReceived = recvfrom(udpSocket, pongMessage, sizeof(pongMessage), 0,
                                     (sockaddr*)&fromAddr, &fromAddrLen);
        if (bytesReceived == SOCKET_ERROR) {
            std::cerr << "recvfrom failed" << std::endl;
            break;
        }

        // 응답받은 시간 측정
        auto end = std::chrono::high_resolution_clock::now();
        std::chrono::duration<double> elapsed = end - start;

        std::cout << "Round " << (round + 1) << ": Sent " << TOTAL_PACKETS << " packets in "
                  << elapsed.count() << " seconds." << std::endl;
    }

    // 소켓 종료
    closesocket(udpSocket);
    WSACleanup();
    return 0;
}
