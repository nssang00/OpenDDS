#include "CTBZMemOutputStream.hpp"

using namespace ctb;

CTBZMemOutputStream::CTBZMemOutputStream(int level) : closed_(false) {
    zs_.zalloc = Z_NULL;
    zs_.zfree = Z_NULL;
    zs_.opaque = Z_NULL;

    // gzip 래퍼 설정을 위한 windowBits: 15 + 16
    if (deflateInit2(&zs_, level, Z_DEFLATED, 15 + 16, 8, Z_DEFAULT_STRATEGY) != Z_OK) {
        throw CTBException("Failed to initialize zlib stream");
    }
    
    out_buffer_.reserve(64 * 1024); 
}

CTBZMemOutputStream::~CTBZMemOutputStream() {
    if (!closed_) {
        deflateEnd(&zs_);
    }
}

uint32_t CTBZMemOutputStream::write(const void *ptr, uint32_t size) {
    if (closed_) throw CTBException("Stream already closed");
    if (size == 0) return 0;

    zs_.next_in = reinterpret_cast<Bytef*>(const_cast<void*>(ptr));
    zs_.avail_in = size;

    uint8_t temp[16384];
    while (zs_.avail_in > 0) {
        zs_.next_out = temp;
        zs_.avail_out = sizeof(temp);

        int ret = deflate(&zs_, Z_NO_FLUSH);
        if (ret == Z_STREAM_ERROR) throw CTBException("zlib deflate error");

        size_t compressedSize = sizeof(temp) - zs_.avail_out;
        if (compressedSize > 0) {
            out_buffer_.insert(out_buffer_.end(), temp, temp + compressedSize);
        }
    }

    return size;
}

void CTBZMemOutputStream::close() {
    if (closed_) return;

    uint8_t temp[16384];
    int ret;
    do {
        zs_.next_out = temp;
        zs_.avail_out = sizeof(temp);

        // 더 이상 입력이 없음을 알리고 마무리(Trailer) 생성
        ret = deflate(&zs_, Z_FINISH);
        if (ret == Z_STREAM_ERROR) throw CTBException("zlib finalize error");

        size_t compressedSize = sizeof(temp) - zs_.avail_out;
        if (compressedSize > 0) {
            out_buffer_.insert(out_buffer_.end(), temp, temp + compressedSize);
        }
    } while (ret != Z_STREAM_END); // Z_STREAM_END가 나올 때까지 반복

    deflateEnd(&zs_);
    closed_ = true;
}
