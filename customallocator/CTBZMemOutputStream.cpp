#include "CTBZBufferOutputStream.hpp"

namespace ctb {

CTBZBufferOutputStream::CTBZBufferOutputStream(int compressionLevel)
    : buffer_(), closed_(false)
{
    std::memset(&zstr_, 0, sizeof(zstr_));

    int ret = deflateInit2(&zstr_, compressionLevel, Z_DEFLATED,
                           15 + 16, 8, Z_DEFAULT_STRATEGY);
    if (ret != Z_OK) {
        throw CTBException("deflateInit2 failed");
    }

    buffer_.resize(16384);
    zstr_.next_out = reinterpret_cast<Bytef*>(buffer_.data());
    zstr_.avail_out = static_cast<uInt>(buffer_.size());
}

CTBZBufferOutputStream::~CTBZBufferOutputStream() {
     close();
}

void CTBZBufferOutputStream::ensureOutputSpace(size_t required) {
    if (zstr_.avail_out < required) {
        size_t used = buffer_.size() - zstr_.avail_out;

        buffer_.resize(used + required + 4096);

        zstr_.next_out = reinterpret_cast<Bytef*>(buffer_.data() + used);
        zstr_.avail_out = static_cast<uInt>(buffer_.size() - used);
    }
}

uint32_t CTBZBufferOutputStream::write(const void* ptr, uint32_t size) {
    if (closed_) {
        throw CTBException("Stream already closed");
    }
    if (size == 0) return 0;

    zstr_.next_in = const_cast<Bytef*>(reinterpret_cast<const Bytef*>(ptr));
    zstr_.avail_in = size;

    while (zstr_.avail_in > 0) {
        ensureOutputSpace(4096);

        int ret = deflate(&zstr_, Z_NO_FLUSH);
        if (ret != Z_OK) {
            throw CTBException("deflate failed");
        }
    }

    return size;
}

void CTBZBufferOutputStream::close() {
    if (closed_) return;

    int ret;
    do {
        ensureOutputSpace(4096);
        ret = deflate(&zstr_, Z_FINISH);
        if (ret != Z_OK && ret != Z_STREAM_END) {
            throw CTBException("deflate(Z_FINISH) failed");
        }
    } while (ret != Z_STREAM_END);

    buffer_.resize(buffer_.size() - zstr_.avail_out);

    (void)deflateEnd(&zstr_);
    closed_ = true;
}

} // namespace ctb

//////////////////
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
