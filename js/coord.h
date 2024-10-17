#include <memory>
#include <list>
#include <iostream>
#include <type_traits>

// ICoord 인터페이스 정의
class ICoord {
public:
    virtual ~ICoord() = default;
    virtual void print() const = 0;  // 인터페이스 함수
};

// Coord 클래스는 ICoord 인터페이스만 참조
class Coord {
public:
    // 템플릿 생성자: 어떤 ICoord 타입이든 받아서 처리 가능
    template<typename T, typename = typename std::enable_if<std::is_base_of<ICoord, T>::value>::type>
    Coord(T impl) : _pimpl(std::make_shared<T>(impl)) {}

    // 복사 생성자
    Coord(const Coord& other) : _pimpl(other._pimpl ? other._pimpl : nullptr) {}

    // 대입 연산자
    Coord& operator=(const Coord& other) {
        if (this != &other) {
            _pimpl = other._pimpl;
        }
        return *this;
    }

    virtual ~Coord() = default;

    // print 함수 호출 (ICoord의 인터페이스만 호출)
    void print() const {
        if (_pimpl) {
            _pimpl->print();
        } else {
            std::cout << "Empty Coord" << std::endl;
        }
    }

private:
    // ICoord 인터페이스를 포인터로 관리
    std::shared_ptr<ICoord> _pimpl;
};

// 2D 좌표를 처리하는 Coord2D 클래스 (ICoord 인터페이스 구현)
class Coord2D : public ICoord {
public:
    Coord2D(double x, double y) : x(x), y(y) {}

    void print() const override {
        std::cout << "2D Coord: (" << x << ", " << y << ")" << std::endl;
    }

private:
    double x, y;
};

// 3D 좌표를 처리하는 Coord3D 클래스 (ICoord 인터페이스 구현)
class Coord3D : public ICoord {
public:
    Coord3D(double x, double y, double z) : x(x), y(y), z(z) {}

    void print() const override {
        std::cout << "3D Coord: (" << x << ", " << y << ", " << z << ")" << std::endl;
    }

private:
    double x, y, z;
};

int main() {
    // std::list<Coord> 객체에 다양한 타입의 Coord2D 및 Coord3D 삽입
    std::list<Coord> coordList;

    // 명시적인 Coord 캐스팅 없이 직접 객체를 넣을 수 있음
    coordList.emplace_back(Coord2D(1.0, 2.0));
    coordList.emplace_back(Coord3D(3.0, 4.0, 5.0));
    coordList.emplace_back(Coord2D(6.0, 7.0));

    // 출력
    for (const auto& coord : coordList) {
        coord.print();
    }

    return 0;
}
