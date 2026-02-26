#include "CTBZMemOutputStream.hpp"
#include <cstring>   // std::memcpy

using namespace ctb;

CTBZMemOutputStream::CTBZMemOutputStream(int level, size_t chunk_size) {
    initZStream(level);
    chunk_buffer_.resize(chunk_size);
}

void CTBZMemOutputStream::initZStream(int level) {
    zstream_.zalloc = Z_NULL;
    zstream_.zfree  = Z_NULL;
    zstream_.opaque = Z_NULL;

    // gzip 헤더 + 창 크기 15 + gzip wrapper (16)
    int windowBits = 15 + 16;

    if (deflateInit2(&zstream_, level, Z_DEFLATED, windowBits, 8, Z_DEFAULT_STRATEGY) != Z_OK) {
        throw CTBException("deflateInit2 failed for gzip stream");
    }
}

CTBZMemOutputStream::\~CTBZMemOutputStream() {
    if (!closed_) {
        try { close(); } catch (...) {}
    }
    deflateEnd(&zstream_);
}

uint32_t CTBZMemOutputStream::write(const void* ptr, uint32_t size) {
    ensureNotClosed();

    if (size == 0) return 0;

    zstream_.next_in   = reinterpret_cast<Bytef*>(const_cast<void*>(ptr));
    zstream_.avail_in  = size;

    while (zstream_.avail_in > 0) {
        zstream_.next_out  = chunk_buffer_.data();
        zstream_.avail_out = static_cast<uInt>(chunk_buffer_.size());

        int ret = deflate(&zstream_, Z_NO_FLUSH);
        if (ret != Z_OK && ret != Z_STREAM_END) {
            throw CTBException("deflate() error during write");
        }

        size_t produced = chunk_buffer_.size() - zstream_.avail_out;
        if (produced > 0) {
            out_buffer_.insert(out_buffer_.end(),
                               chunk_buffer_.begin(),
                               chunk_buffer_.begin() + produced);
        }
    }

    return size;
}

void CTBZMemOutputStream::close() {
    if (closed_) return;

    // 최종 flush (Z_FINISH)
    deflateChunk(Z_FINISH);

    // deflateEnd는 소멸자에서도 호출되지만 여기서도 안전하게
    deflateEnd(&zstream_);
    closed_ = true;
}

void CTBZMemOutputStream::deflateChunk(int flush) {
    do {
        zstream_.next_out  = chunk_buffer_.data();
        zstream_.avail_out = static_cast<uInt>(chunk_buffer_.size());

        int ret = deflate(&zstream_, flush);
        if (ret == Z_STREAM_ERROR) {
            throw CTBException("deflate stream error");
        }

        size_t produced = chunk_buffer_.size() - zstream_.avail_out;
        if (produced > 0) {
            out_buffer_.insert(out_buffer_.end(),
                               chunk_buffer_.begin(),
                               chunk_buffer_.begin() + produced);
        }

        if (ret == Z_STREAM_END) break;
    } while (zstream_.avail_out == 0);  // 더 출력할 게 있으면 반복
}

void CTBZMemOutputStream::ensureNotClosed() const {
    if (closed_) {
        throw CTBException("CTBZMemOutputStream already closed");
    }
}

std::vector<uint8_t> CTBZMemOutputStream::takeCompressedData() {
    close();  // 필요 시 자동 close
    return std::move(out_buffer_);
}
