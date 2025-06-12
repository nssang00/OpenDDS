#include <iostream>
#include <cstdint>
#include <cstring>
#include <iomanip>

//=========================
// Packed Struct
//=========================
#pragma pack(push, 1)
struct ExampleData_Packed {
    double   value;      // 8 bytes
    uint8_t  id;         // 1 byte
    uint16_t size;       // 2 bytes
    uint32_t timestamp;  // 4 bytes
};
#pragma pack(pop)

//=========================
// Regular Struct
//=========================
struct ExampleData {
    double   value;      // 8 bytes (likely 8-byte aligned)
    uint8_t  id;         // 1 byte
    uint16_t size;       // 2 bytes
    uint32_t timestamp;  // 4 bytes
    // compiler likely adds padding for alignment
};

//=========================
// Copy Function
//=========================
void copyFromPacked(const ExampleData_Packed& src, ExampleData& dst) {
    dst.value = src.value;
    dst.id = src.id;
    dst.size = src.size;
    dst.timestamp = src.timestamp;
}

//=========================
// Print Helper
//=========================
void printExampleData(const ExampleData& data) {
    std::cout << std::fixed << std::setprecision(2);
    std::cout << "ExampleData contents:\n";
    std::cout << "  value     = " << data.value << "\n";
    std::cout << "  id        = " << static_cast<int>(data.id) << "\n";
    std::cout << "  size      = " << data.size << "\n";
    std::cout << "  timestamp = 0x" << std::hex << data.timestamp << std::dec << "\n";
}

//=========================
// Main
//=========================
int main() {
    // Binary stream: value = 3.14159, id = 0x42, size = 0x0010, timestamp = 0x12345678
    uint8_t rawBuffer[] = {
        0x18, 0x2D, 0x44, 0x54, 0xFB, 0x21, 0x09, 0x40,  // double 3.14159 (little-endian IEEE 754)
        0x42,                   // id = 66
        0x10, 0x00,             // size = 16
        0x78, 0x56, 0x34, 0x12  // timestamp = 0x12345678
    };

    ExampleData_Packed packed;
    memcpy(&packed, rawBuffer, sizeof(packed));

    ExampleData regular;
    copyFromPacked(packed, regular);

    printExampleData(regular);

    return 0;
}
