#include <iostream>
#include <cstdint>
#include <cstring>
#include <iomanip>

//=========================
// Packed Struct
//=========================
#pragma pack(push, 1)
struct ExampleData_Packed {
    uint8_t  id;
    uint16_t size;
    uint32_t timestamp;
};
#pragma pack(pop)

//=========================
// Regular Struct
//=========================
struct ExampleData {
    uint8_t  id;
    uint16_t size;
    uint32_t timestamp;
};

//=========================
// Copy Function
//=========================
void copyFromPacked(const ExampleData_Packed& src, ExampleData& dst) {
    dst.id = src.id;
    dst.size = src.size;
    dst.timestamp = src.timestamp;
}

//=========================
// Print Helper
//=========================
void printExampleData(const ExampleData& data) {
    std::cout << "ExampleData contents:\n";
    std::cout << "  id        = " << static_cast<int>(data.id) << "\n";
    std::cout << "  size      = " << data.size << "\n";
    std::cout << "  timestamp = 0x" << std::hex << data.timestamp << std::dec << "\n";
}

//=========================
// Main
//=========================
int main() {
    uint8_t rawBuffer[] = {
        0x42,
        0x10, 0x00,
        0x78, 0x56, 0x34, 0x12
    };

    ExampleData_Packed packed;
    memcpy(&packed, rawBuffer, sizeof(packed));

    ExampleData regular;
    copyFromPacked(packed, regular);

    printExampleData(regular);

    return 0;
}
