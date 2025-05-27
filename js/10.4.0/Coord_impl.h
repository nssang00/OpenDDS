// 기본 Impl 클래스
class Impl {
public:
    virtual ~Impl() = default;
    virtual std::unique_ptr<Impl> clone() const = 0;
};

// Impl2D 클래스
class Impl2D : public Impl {
    double x, y;
public:
    Impl2D(double x, double y) : x(x), y(y) {}
    std::unique_ptr<Impl> clone() const override {
        return std::make_unique<Impl2D>(*this); // 깊은 복사
    }
};

// Coord 클래스
class Coord {
protected:
    std::shared_ptr<Impl> _pImpl;
public:
    Coord() : _pImpl(nullptr) {}
    Coord(const Coord& other) : _pImpl(other._pImpl ? other._pImpl->clone() : nullptr) {}
};

// Coord2D 클래스
class Coord2D : public Coord {
public:
    Coord2D(double x, double y) 
        : Coord(std::make_unique<Impl2D>(x, y)) {} // ✅ make_shared 사용
};
