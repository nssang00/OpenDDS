class SpeedTest {
    uint32_t sum = 0;
    uint8_t i = 0;
    void SumDataBlock(uint8_t data[], uint16_t len) {
        for (i = 0; i < len; i++) {
            sum += data[i];
        }
    }
public:
};

std::bind(&SpeedTest::SumDataBlock, this, 3, 5);
[this](){
    SumDataBlock(3, 5);
};
