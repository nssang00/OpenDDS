#include <iostream>
#include <sys/epoll.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <fcntl.h>

class EventHandler {
public:
    virtual void handleEvent(int fd) = 0;
};

class Acceptor : public EventHandler {
public:
    void handleEvent(int fd) override {
        struct sockaddr_in client_addr;
        socklen_t client_addr_len = sizeof(client_addr);
        int client_fd = accept(fd, (struct sockaddr *)&client_addr, &client_addr_len);
        if(client_fd == -1) {
            std::cerr << "Failed to accept client\n";
        } else {
            std::cout << "Accepted client on fd " << client_fd << "\n";
        }
    }
};

class Reactor {
private:
    int epoll_fd;
    int server_fd;
    struct epoll_event event;
    Acceptor* acceptor;
public:
    Reactor(Acceptor* acc) : acceptor(acc) {
        server_fd = socket(AF_INET, SOCK_STREAM, 0);
        if(server_fd == -1) {
            std::cerr << "Failed to create socket\n";
            return;
        }
        
        struct sockaddr_in server_addr;
        server_addr.sin_family = AF_INET;
        server_addr.sin_port = htons(8080);
        server_addr.sin_addr.s_addr = htonl(INADDR_ANY);
        if(bind(server_fd, (struct sockaddr *)&server_addr, sizeof(server_addr)) == -1) {
            std::cerr << "Failed to bind socket\n";
            close(server_fd);
            return;
        }
        
        if(listen(server_fd, 10) == -1) {
            std::cerr << "Failed to listen on socket\n";
            close(server_fd);
            return;
        }

        epoll_fd = epoll_create1(0);
        if(epoll_fd == -1) {
            std::cerr << "Failed to create epoll file descriptor\n";
            return;
        }
        
        event.events = EPOLLIN;
        event.data.fd = server_fd;
        if(epoll_ctl(epoll_fd, EPOLL_CTL_ADD, server_fd, &event)) {
            std::cerr << "Failed to add file descriptor to epoll\n";
            close(server_fd);
            close(epoll_fd);
            return;
        }
    }

    void eventLoop() {
        while(true) {
            if(epoll_wait(epoll_fd, &event, 1, 3000) == -1) {
                std::cerr << "Failed to wait for epoll\n";
                close(server_fd);
                close(epoll_fd);
                return;
            }
            acceptor->handleEvent(server_fd);
        }
    }
};

int main() {
    Acceptor acceptor;
    Reactor reactor(&acceptor);
    reactor.eventLoop();
    return 0;
}
