#include <iostream>
#include <queue>
#include <string>
#include <winsock2.h>
#include <windows.h>
#include <ws2tcpip.h>

#pragma comment(lib, "Ws2_32.lib")

const int BUFFER_SIZE = 1024; // 1KB
const int TOTAL_PACKETS = 10000; // Number of packets to receive per round

std::queue<std::string> dataQueue;
bool done = false;
sockaddr_in clientAddr;
int clientAddrLen = sizeof(clientAddr);

class Mutex {
public:
    Mutex() {
        InitializeCriticalSection(&cs);
    }

    ~Mutex() {
        DeleteCriticalSection(&cs);
    }

    void lock() {
        EnterCriticalSection(&cs);
    }

    void unlock() {
        LeaveCriticalSection(&cs);
    }

private:
    CRITICAL_SECTION cs;
    friend class Cond;
};

class Cond {
public:
    Cond() {
        InitializeConditionVariable(&condVar);
    }

    void wait(Mutex& mutex) {
        SleepConditionVariableCS(&condVar, &mutex.cs, INFINITE);
    }

    void notify() {
        WakeConditionVariable(&condVar);
    }

private:
    CONDITION_VARIABLE condVar;
};

Cond cond;
Mutex mutex;

// Producer function: Receives packets and pushes them to the queue
DWORD WINAPI producer(LPVOID lpParam) {
    WSADATA wsaData;
    SOCKET udpSocket;
    sockaddr_in serverAddr;
    char buffer[BUFFER_SIZE];

    // Initialize Winsock
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        std::cerr << "WSAStartup failed" << std::endl;
        return 1;
    }

    // Create socket
    udpSocket = socket(AF_INET, SOCK_DGRAM, 0);
    if (udpSocket == INVALID_SOCKET) {
        std::cerr << "Socket creation failed" << std::endl;
        WSACleanup();
        return 1;
    }

    // Set up server address
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(8888); // Port number
    serverAddr.sin_addr.s_addr = INADDR_ANY;

    // Bind
    if (bind(udpSocket, (sockaddr*)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR) {
        std::cerr << "Bind failed" << std::endl;
        closesocket(udpSocket);
        WSACleanup();
        return 1;
    }

    std::cout << "Receiver is waiting for packets..." << std::endl;

    for (int round = 0; round < 10; ++round) {
        int packetCount = 0;

        // Receive packets
        while (packetCount < TOTAL_PACKETS) {
            int bytesReceived = recvfrom(udpSocket, buffer, BUFFER_SIZE, 0,
                                         (sockaddr*)&clientAddr, &clientAddrLen);
            if (bytesReceived == SOCKET_ERROR) {
                std::cerr << "recvfrom failed" << std::endl;
                break;
            }

            // Push the received packet data to the queue
            mutex.lock();
            dataQueue.push(std::string(buffer, bytesReceived));
            packetCount++;
            cond.notify(); // Notify the consumer
            mutex.unlock();
        }

        // Add "PONG" message to the queue for consumer to process
        mutex.lock();
        dataQueue.push("PONG");
        cond.notify();
        mutex.unlock();
    }

    // Signal that receiving is done
    mutex.lock();
    done = true;
    cond.notify();
    mutex.unlock();

    // Clean up
    closesocket(udpSocket);
    WSACleanup();

    return 0;
}

// Consumer function: Processes packets from the queue and sends "PONG" messages back to the client
DWORD WINAPI consumer(LPVOID lpParam) {
    SOCKET udpSocket = *(SOCKET*)lpParam;

    while (true) {
        mutex.lock();

        // Wait for data or until done
        while (dataQueue.empty() && !done) {
            cond.wait(mutex);
        }

        // Process all packets in the queue
        while (!dataQueue.empty()) {
            std::string packet = dataQueue.front();
            dataQueue.pop();

            if (packet == "PONG") {
                // Send "PONG" message back to the client
                const char* pongMessage = "PONG";
                sendto(udpSocket, pongMessage, strlen(pongMessage), 0,
                       (sockaddr*)&clientAddr, clientAddrLen);
                std::cout << "Sent PONG message to client" << std::endl;
            } else {
                std::cout << "Consumed packet of size " << packet.size() << " bytes" << std::endl;
            }
        }

        // Check if we're done
        bool finished = done && dataQueue.empty();
        mutex.unlock();

        if (finished) {
            break;
        }
    }

    return 0;
}

int main() {
    WSADATA wsaData;
    SOCKET udpSocket;

    // Initialize Winsock
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        std::cerr << "WSAStartup failed" << std::endl;
        return 1;
    }

    // Create socket
    udpSocket = socket(AF_INET, SOCK_DGRAM, 0);
    if (udpSocket == INVALID_SOCKET) {
        std::cerr << "Socket creation failed" << std::endl;
        WSACleanup();
        return 1;
    }

    // Create producer and consumer threads
    HANDLE producerThread = CreateThread(NULL, 0, producer, NULL, 0, NULL);
    HANDLE consumerThread = CreateThread(NULL, 0, consumer, &udpSocket, 0, NULL);

    // Wait for threads to finish
    WaitForSingleObject(producerThread, INFINITE);
    WaitForSingleObject(consumerThread, INFINITE);

    // Clean up
    CloseHandle(producerThread);
    CloseHandle(consumerThread);
    closesocket(udpSocket);
    WSACleanup();

    return 0;
}
