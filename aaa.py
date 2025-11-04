# --- 플랫폼별 설정 ---
    if sys.platform == "win32":
        # Windows: spawn → 워커별 1회 load_map
        mp.set_start_method("spawn", force=True)
        pool_ctx = mp.Pool(
            processes=args.processes,
            initializer=init_worker,
            initargs=(args.xml, args.tile_size, metatile_size)
        )
    else:
        # Linux/macOS: 기본 fork 사용, 부모에서 1회 load_map 후 상속
        global _mapnik_map
        _mapnik_map = mapnik.Map(args.tile_size * metatile_size,
                                 args.tile_size * metatile_size)
        mapnik.load_map(_mapnik_map, args.xml)
        pool_ctx = mp.Pool(processes=args.processes)
