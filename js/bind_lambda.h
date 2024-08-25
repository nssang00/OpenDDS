class SpeedTest {
    uint32_t sum = 0;
    uint8_t i = 0;
    void SumDataBlock(uint8_t data[], uint16_t len) {
        for (i = 0; i < len; i++) {
            sum += data[i];
        }
    }
public:
    function<SumDataBlockEventHandler> Bind() {
        return bind(&SpeedTest::SumDataBlock, this, _1, _2);
    }
    function<SumDataBlockEventHandler> Lambda() {
        return [this](auto data, auto len)
        {
            SumDataBlock(data, len);
        };
    }
};
