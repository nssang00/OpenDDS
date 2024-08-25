class SpeedTest {
    uint32_t sum = 0;
    uint8_t i = 0;
    void SumDataBlock(int a, int b) {
        auto lambda = [=](){
            SumDataBlock(a, b);
        };
    }
public:
};

std::bind(&SpeedTest::SumDataBlock, this, 3, 5);
[this](){
    SumDataBlock(3, 5);
};
