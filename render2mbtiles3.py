#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, math, sqlite3, argparse, mapnik, time
import multiprocessing as mp

# --------- 상수 ---------
TILE_SIZE = 256
R = 6378137.0
META = 8
FORMAT = "png256"   # mapnik encoder: png, png256, png8, jpeg80, webp90 ...

# --------- 타일/좌표 유틸 ---------
def lonlat_to_merc(lon, lat):
    x = R * math.radians(lon)
    y = R * math.log(math.tan(math.pi/4 + math.radians(lat)/2))
    return x, y

def tile_bounds_xyz(x, y, z):
    n = 2.0 ** z
    lon_left  = x / n * 360.0 - 180.0
    lon_right = (x + 1) / n * 360.0 - 180.0
    lat_top   = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    lat_bot   = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n))))
    return lon_left, lat_bot, lon_right, lat_top

def bbox_3857_for_tile(x, y, z):
    min_lon, min_lat, max_lon, max_lat = tile_bounds_xyz(x, y, z)
    minx, miny = lonlat_to_merc(min_lon, min_lat)
    maxx, maxy = lonlat_to_merc(max_lon, max_lat)
    return mapnik.Box2d(minx, miny, maxx, maxy)

def xyz_to_tms_row(y, z):
    return (2**z - 1) - y  # MBTiles uses TMS

# --------- DB ---------
def ensure_mbtiles(path, name="OSM Raster"):
    new = not os.path.exists(path)
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    cur.execute("PRAGMA journal_mode=MEMORY;")
    cur.execute("PRAGMA synchronous=OFF;")
    cur.execute("PRAGMA temp_store=MEMORY;")
    if new:
        cur.execute("CREATE TABLE metadata (name TEXT, value TEXT);")
        cur.execute("CREATE TABLE tiles (zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER, tile_data BLOB);")
        cur.execute("CREATE UNIQUE INDEX tile_index ON tiles (zoom_level, tile_column, tile_row);")
        meta = {
            "name": name,
            "type": "baselayer",
            "version": "1",
            "description": "Rendered by render_to_mbtiles_meta8_mp.py",
            "format": "png",  # MBTiles convention: png/jpeg/webp (png256도 png로 기록)
            "minzoom": "0",
            "maxzoom": "22",
            "bounds": "-180,-85,180,85",
            "center": "0,0,2",
        }
        for k, v in meta.items():
            cur.execute("INSERT INTO metadata (name,value) VALUES (?,?)", (k, v))
        conn.commit()
    return conn

# --------- 워커 컨텍스트 ---------
_worker_ctx = {}

def worker_init(xml_path, tilesize, z, bg, xmin, xmax, ymin, ymax):
    meta_px = tilesize * META
    m = mapnik.Map(meta_px, meta_px)
    mapnik.load_map(m, xml_path)
    if bg and bg != "transparent":
        m.background = mapnik.Color(bg)
    _worker_ctx["map"] = m
    _worker_ctx["tilesize"] = tilesize
    _worker_ctx["z"] = z
    _worker_ctx["xmin"] = xmin
    _worker_ctx["xmax"] = xmax
    _worker_ctx["ymin"] = ymin
    _worker_ctx["ymax"] = ymax

def render_meta_tile(task):
    """
    task = (mx, my) 메타타일 좌상단 XYZ
    반환: [(z, x, y_tms, blob_bytes), ...]  // sqlite3.Binary는 메인에서 감쌈
    """
    mx, my = task
    m   = _worker_ctx["map"]
    ts  = _worker_ctx["tilesize"]
    z   = _worker_ctx["z"]
    xmin = _worker_ctx["xmin"]
    xmax = _worker_ctx["xmax"]
    ymin = _worker_ctx["ymin"]
    ymax = _worker_ctx["ymax"]

    # 메타타일 bbox (좌하~우상 포함)
    bbox_ll = bbox_3857_for_tile(mx, my + META - 1, z)
    bbox_ur = bbox_3857_for_tile(mx + META - 1, my, z)
    bbox = mapnik.Box2d(
        min(bbox_ll.minx, bbox_ur.minx),
        min(bbox_ll.miny, bbox_ur.miny),
        max(bbox_ll.maxx, bbox_ur.maxx),
        max(bbox_ll.maxy, bbox_ur.maxy),
    )
    m.zoom_to_box(bbox)

    # 메타 렌더
    meta_im = mapnik.Image(ts * META, ts * META)
    mapnik.render(m, meta_im)

    # 잘라서 인코딩
    out_rows = []
    for dx in range(META):
        for dy in range(META):
            tx, ty = mx + dx, my + dy
            if tx < xmin or tx > xmax or ty < ymin or ty > ymax:
                continue
            view = meta_im.view(dx * ts, dy * ts, ts, ts)
            blob = view.tostring(FORMAT)  # bytes
            out_rows.append((z, tx, xyz_to_tms_row(ty, z), blob))
    return out_rows

# --------- 메인 ---------
def main():
    ap = argparse.ArgumentParser(description="Meta-tiles (8x8, png256), multiprocess render, single-writer MBTiles.")
    ap.add_argument("--xml", required=True)
    ap.add_argument("--mbtiles", required=True)
    ap.add_argument("--z", type=int, required=True)
    ap.add_argument("--xmin", type=int, required=True)
    ap.add_argument("--xmax", type=int, required=True)
    ap.add_argument("--ymin", type=int, required=True)
    ap.add_argument("--ymax", type=int, required=True)
    ap.add_argument("--tilesize", type=int, default=TILE_SIZE)
    ap.add_argument("--bg", default="transparent")
    ap.add_argument("--workers", type=int, default=max(1, mp.cpu_count()-1))
    ap.add_argument("--commit_batch", type=int, default=4000, help="commit per N tiles")
    args = ap.parse_args()

    # 메타 시작 좌표 목록
    tasks = []
    for mx in range(args.xmin, args.xmax + 1, META):
        for my in range(args.ymin, args.ymax + 1, META):
            tasks.append((mx, my))

    total_tiles = (args.xmax - args.xmin + 1) * (args.ymax - args.ymin + 1)
    t0 = time.time()

    # 단일 writer DB 커넥션
    conn = ensure_mbtiles(args.mbtiles, name=os.path.basename(args.mbtiles))
    cur = conn.cursor()

    # 워커 풀
    with mp.Pool(
        processes=args.workers,
        initializer=worker_init,
        initargs=(args.xml, args.tilesize, args.z, args.bg, args.xmin, args.xmax, args.ymin, args.ymax),
        maxtasksperchild=50,  # 메모리 누수 방지(옵션)
    ) as pool:
        pending = 0
        written = 0
        for rows in pool.imap_unordered(render_meta_tile, tasks, chunksize=1):
            # rows: [(z, x, y_tms, blob_bytes), ...]
            if not rows:
                continue
            cur.executemany(
                "INSERT OR REPLACE INTO tiles (zoom_level,tile_column,tile_row,tile_data) VALUES (?,?,?,?)",
                [(z, x, y, sqlite3.Binary(b)) for (z, x, y, b) in rows]
            )
            pending += len(rows)
            written += len(rows)
            if pending >= args.commit_batch:
                conn.commit()
                print(f"[z{args.z}] +{pending} tiles committed ({written}/{total_tiles}, {written/total_tiles:.1%})")
                pending = 0

        if pending:
            conn.commit()
            print(f"[z{args.z}] +{pending} tiles committed (final)")

    conn.close()
    print(f"✅ Done: {total_tiles} tiles → {args.mbtiles}  ({time.time()-t0:.1f}s)")

if __name__ == "__main__":
    # Windows 호환을 위해 필수
    mp.freeze_support()
    main()
