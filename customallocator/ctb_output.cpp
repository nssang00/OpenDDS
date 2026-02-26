class CTBVSIMemGZOutputStream : public ctb::CTBOutputStream {
public:
  CTBVSIMemGZOutputStream(const char *vsimemPath)
    : vsimemPath(vsimemPath), closed(false) {}

  ~CTBVSIMemGZOutputStream() {
    if (!closed) close();
  }

  /// 데이터를 내부 버퍼에 누적 (압축은 close() 시에 한 번에)
  uint32_t write(const void *ptr, uint32_t size) override {
    const uint8_t *bytes = static_cast<const uint8_t *>(ptr);
    rawBuf.insert(rawBuf.end(), bytes, bytes + size);
    return size;
  }

  void close() {
    if (closed) return;
    closed = true;

    if (rawBuf.empty()) return;

    // ── zlib로 gzip 압축 ──────────────────────────────
    z_stream zs = {};
    // deflateInit2: gzip 포맷 (windowBits = 15 + 16)
    if (deflateInit2(&zs, Z_BEST_SPEED, Z_DEFLATED,
                     15 + 16,   // +16 = gzip 헤더
                     8, Z_DEFAULT_STRATEGY) != Z_OK) {
      throw ctb::CTBException("zlib deflateInit2 failed");
    }

    std::vector<uint8_t> compBuf(deflateBound(&zs, rawBuf.size()));

    zs.next_in   = rawBuf.data();
    zs.avail_in  = static_cast<uInt>(rawBuf.size());
    zs.next_out  = compBuf.data();
    zs.avail_out = static_cast<uInt>(compBuf.size());

    int ret = deflate(&zs, Z_FINISH);
    deflateEnd(&zs);

    if (ret != Z_STREAM_END) {
      throw ctb::CTBException("zlib deflate failed");
    }

    const uLong compSize = zs.total_out;

    VSILFILE *fp = VSIFOpenL(vsimemPath.c_str(), "wb");
    if (!fp) {
      throw ctb::CTBException("Failed to open vsimem path");
    }

    VSIFWriteL(compBuf.data(), 1, compSize, fp);
    VSIFCloseL(fp);
  }

private:
  std::string          vsimemPath;
  std::vector<uint8_t> rawBuf;    // 누적된 비압축 데이터
  bool                 closed;
};

void serializeTile(MeshTile *tile, bool writeVertexNormals = false) override {
  const TileCoordinate &coord = tile->getCoordinate();

  ostringstream vpath_ss;
  vpath_ss << "/vsimem/mesh_tile_"
           << std::hash<std::thread::id>{}(std::this_thread::get_id())
           << ".terrain";
  const string vpath = vpath_ss.str();

  // CTBZFileOutputStream(gzopen) 대신 VSImem 스트림 사용
  {
    CTBVSIMemGZOutputStream stream(vpath.c_str());
    tile->writeFile(stream, writeVertexNormals);  // ← 오버로드 직접 호출
    stream.close();
  } // 소멸자에서 close() 자동 호출되지만 명시적으로 먼저 호출

  // /vsimem/ 에서 blob 읽기 → MBTiles INSERT
  vsi_l_offset fileLen = 0;
  GByte *data = VSIGetMemFileBuffer(vpath.c_str(), &fileLen, FALSE);

  if (data && fileLen > 0) {
    insertTileMBTiles(coord.zoom, coord.x, coord.y, data, (int)fileLen);
  }

  VSIUnlink(vpath.c_str());
}
