#include <memory>
#include <list>
#include <iostream>

class Coord {
public:
    Coord();
    Coord(const Coord& other);
    Coord& operator=(const Coord& other);
    virtual ~Coord() = default;

    virtual void print() const;

protected:
    class Impl;
    std::shared_ptr<Impl> _pimpl;

private:
    class Impl {
    public:
        virtual ~Impl() = default;
        virtual void print() const = 0;
        virtual std::unique_ptr<Impl> clone() const = 0;
    };

    class Impl2D : public Impl {
    public:
        Impl2D(double x, double y) : x(x), y(y) {}
        void print() const override {
            std::cout << "2D Coord: (" << x << ", " << y << ")" << std::endl;
        }
        std::unique_ptr<Impl> clone() const override {
            return std::make_unique<Impl2D>(*this);
        }
    private:
        double x, y;
    };

    class Impl3D : public Impl {
    public:
        Impl3D(double x, double y, double z) : x(x), y(y), z(z) {}
        void print() const override {
            std::cout << "3D Coord: (" << x << ", " << y << ", " << z << ")" << std::endl;
        }
        std::unique_ptr<Impl> clone() const override {
            return std::make_unique<Impl3D>(*this);
        }
    private:
        double x, y, z;
    };
};

Coord::Coord() : _pimpl(nullptr) {}

Coord::Coord(const Coord& other) : _pimpl(other._pimpl ? other._pimpl->clone() : nullptr) {}

Coord& Coord::operator=(const Coord& other) {
    if (this != &other) {
        _pimpl = other._pimpl ? other._pimpl->clone() : nullptr;
    }
    return *this;
}

void Coord::print() const {
    if (_pimpl) {
        _pimpl->print();
    } else {
        std::cout << "Empty Coord" << std::endl;
    }
}

class Coord2D : public Coord {
public:
    Coord2D(double x, double y) {
        _pimpl = std::make_unique<Impl2D>(x, y);
    }
};

class Coord3D : public Coord {
public:
    Coord3D(double x, double y, double z) {
        _pimpl = std::make_unique<Impl3D>(x, y, z);
    }
};

int main() {
    std::list<Coord> coordList;

    coordList.push_back(Coord2D(1.0, 2.0));
    coordList.push_back(Coord3D(3.0, 4.0, 5.0));
    coordList.push_back(Coord2D(6.0, 7.0));

    for (const auto& coord : coordList) {
        coord.print();
    }

    return 0;
}
