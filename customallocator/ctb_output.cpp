void serializeTile(MeshTile *tile, bool writeVertexNormals = false) override {
    const TileCoordinate &coord = tile->getCoordinate();

    ctb::CTBZMemOutputStream mem_stream(Z_BEST_SPEED);  // 또는 Z_DEFAULT_COMPRESSION, Z_BEST_COMPRESSION

    tile->writeFile(mem_stream, writeVertexNormals);

    mem_stream.close();

    auto compressed = mem_stream.takeCompressedData();

    if (!compressed.empty()) {
        insertTileMBTiles(coord.zoom, coord.x, coord.y,
                          compressed.data(),
                          static_cast<int>(compressed.size()));
    }

}

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
