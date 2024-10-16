#include <iostream>
#include <list>
#include <memory>

// 기본 coord 인터페이스 클래스
class coordImpl {
public:
    virtual ~coordImpl() = default;
    virtual void print() const = 0;
    virtual std::shared_ptr<coordImpl> clone() const = 0;
};

// coord 클래스 선언 (실제로 리스트에서 관리)
class coord {
public:
    // 기본 2D 생성자
    coord(int x = 0, int y = 0) 
        : impl(std::make_shared<coord2DImpl>(x, y)) {}

    // 3D 좌표를 생성하는 생성자
    coord(int x, int y, int z) 
        : impl(std::make_shared<coord3DImpl>(x, y, z)) {}

    // 복사 생성자와 대입 연산자에서 다형성 유지
    coord(const coord& other) 
        : impl(other.impl->clone()) {}

    coord& operator=(const coord& other) {
        if (this != &other) {
            impl = other.impl->clone();
        }
        return *this;
    }

    // 출력 함수
    void print() const {
        impl->print();
    }

private:
    std::shared_ptr<coordImpl> impl;  // 다형적 구현을 위한 shared_ptr

    // 내부 2D 구현 클래스
    class coord2DImpl : public coordImpl {
    public:
        coord2DImpl(int x, int y) : x(x), y(y) {}
        
        void print() const override {
            std::cout << "coord2D(" << x << ", " << y << ")\n";
        }

        std::shared_ptr<coordImpl> clone() const override {
            return std::make_shared<coord2DImpl>(*this);
        }

    private:
        int x, y;
    };

    // 내부 3D 구현 클래스
    class coord3DImpl : public coordImpl {
    public:
        coord3DImpl(int x, int y, int z) : x(x), y(y), z(z) {}

        void print() const override {
            std::cout << "coord3D(" << x << ", " << y << ", " << z << ")\n";
        }

        std::shared_ptr<coordImpl> clone() const override {
            return std::make_shared<coord3DImpl>(*this);
        }

    private:
        int x, y, z;
    };
};

int main() {
    std::list<coord> coordList;

    // 2D 좌표 추가
    coord c1(1, 2);
    coordList.push_back(c1); // coord2D 객체 추가

    // 3D 좌표 추가
    coord c2(3, 4, 5);
    coordList.push_back(c2); // coord3D 객체 추가

    // 리스트의 모든 좌표 출력
    for (const auto& c : coordList) {
        c.print();  // coord2D 또는 coord3D에 맞게 출력됨
    }

    return 0;
}
