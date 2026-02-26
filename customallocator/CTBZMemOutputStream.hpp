#ifndef CTB_Z_MEM_OUTPUT_STREAM_HPP
#define CTB_Z_MEM_OUTPUT_STREAM_HPP

#include "CTBException.hpp"
#include <vector>
#include <cstdint>
#include <zlib.h>

namespace ctb {

    class CTBZMemOutputStream {
    public:
        CTBZMemOutputStream(int level = -1);
        virtual ~CTBZMemOutputStream();

        // 데이터를 압축하여 내부 버퍼에 기록
        uint32_t write(const void *ptr, uint32_t size);

        // 스트림을 닫고 gzip Trailer(CRC32, ISIZE) 완성
        void close();

        // 결과물 접근자
        const uint8_t* data() const { return out_buffer_.data(); }
        size_t size() const { return out_buffer_.size(); }

    private:
        z_stream zs_;
        std::vector<uint8_t> out_buffer_;
        bool closed_;

        CTBZMemOutputStream(const CTBZMemOutputStream&) = delete;
        CTBZMemOutputStream& operator=(const CTBZMemOutputStream&) = delete;
    };

} // namespace ctb

#endif
