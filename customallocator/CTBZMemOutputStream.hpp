#pragma once

#include "CTBOutputStream.hpp"  // 기존 CTBOutputStream 부모 클래스 포함
#include <vector>
#include <stdexcept>
#include <zlib.h>

namespace ctb {

class CTBZMemOutputStream : public CTBOutputStream {
public:
    /**
     * @param compression_level  Z_NO_COMPRESSION \~ Z_BEST_COMPRESSION (기본: Z_DEFAULT_COMPRESSION)
     * @param chunk_size         내부 flush 시 사용하는 출력 청크 크기 (기본 64KB)
     */
    explicit CTBZMemOutputStream(int compression_level = Z_DEFAULT_COMPRESSION,
                                 size_t chunk_size = 65536);

    \~CTBZMemOutputStream() override;

    uint32_t write(const void* ptr, uint32_t size) override;

    void close() override;

    // 추가 메서드: 압축 완료된 데이터를 꺼내기
    std::vector<uint8_t> takeCompressedData();           // move semantics
    const std::vector<uint8_t>& peekCompressedData() const { return out_buffer_; }
    size_t getSize() const { return out_buffer_.size(); }
    bool isClosed() const { return closed_; }

private:
    z_stream zstream_ = {};
    std::vector<uint8_t> out_buffer_;       // 최종 압축 데이터 누적
    std::vector<uint8_t> chunk_buffer_;     // 중간 출력용 임시 버퍼
    bool closed_ = false;

    void initZStream(int level);
    void deflateChunk(int flush);
    void ensureNotClosed() const;
};

} // namespace ctb
