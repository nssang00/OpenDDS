#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, math, sqlite3, argparse, mapnik, time
import multiprocessing as mp

# --------- 상수 ----------
TILE_SIZE = 256
R = 6378137.0
META = 8
FORMAT = "png256"    # mapnik encoder: png, png256, png8, jpeg80, webp90 ...

# --------- 타일/좌표 유틸 ----------
def clamp_lat(lat):
    # WebMercator 유효 위도
    return max(min(lat, 85.05112878), -85.05112878)

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
    return (2**z - 1) - y

def lonlat_to_tile_xy(lon, lat, z):
    lat = clamp_lat(lat)
    n = 2.0 ** z
    x = (lon + 180.0) / 360.0 * n
    y = (1.0 - math.log(math.tan(math.radians(lat)) + 1.0 / math.cos(math.radians(lat))) / math.pi) / 2.0 * n
    return int(math.floor(x)), int(math.floor(y))

def tile_range_for_bounds(lon_min, lat_min, lon_max, lat_max, z):
    # (lon_min,lat_min) = 남서, (lon_max,lat_max) = 북동
    lon_min, lon_max = sorted([lon_min, lon_max])
    lat_min, lat_max = sorted([lat_min, lat_max])
    xmin, ymax = lonlat_to_tile_xy(lon_min, lat_min, z)
    xmax, ymin = lonlat_to_tile_xy(lon_max, lat_max, z)
    # 범위 클램프
    n = (1 << z) - 1
    xmin = max(0, min(xmin, n))
    xmax = max(0, min(xmax, n))
    ymin = max(0, min(ymin, n))
    ymax = max(0, min(ymax, n))
    return xmin, xmax, ymin, ymax

# --------- DB ----------
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
            "description": "Rendered by render_to_mbtiles_meta8_mp_zrange.py",
            "format": "png",  # png256도 MBTiles 메타에는 png로 표기
            "minzoom": "0",
            "maxzoom": "22",
            "bounds": "-180,-85,180,85",
            "center": "0,0,2",
        }
        for k, v in meta.items():
            cur.execute("INSERT INTO metadata (name,value) VALUES (?,?)", (k, v))
        conn.commit()
    return conn

# --------- 워커 ----------
_worker_ctx = {}

def worker_init(xml_path, tilesize, bg):
    meta_px = tilesize * META
    m = mapnik.Map(meta_px, meta_px)
    mapnik.load_map(m, xml_path)
    if bg and bg != "transparent":
        m.background = mapnik.Color(bg)
    _worker_ctx["map"] = m
    _worker_ctx["tilesize"] = tilesize

def render_meta_tile(task):
    """
    task = (z, mx, my, xmin_z, xmax_z, ymin_z, ymax_z)
    반환: [(z, x, y_tms, blob_bytes), ...]
    """
    z, mx, my, xmin_z, xmax_z, ymin_z, ymax_z = task
    m  = _worker_ctx["map"]
    ts = _worker_ctx["tilesize"]

    bbox_ll = bbox_3857_for_tile(mx, my + META - 1, z)
    bbox_ur = bbox_3857_for_tile(mx + META - 1, my, z)
    bbox = mapnik.Box2d(
        min(bbox_ll.minx, bbox_ur.minx),
        min(bbox_ll.miny, bbox_ur.miny),
        max(bbox_ll.maxx, bbox_ur.maxx),
        max(bbox_ll.maxy, bbox_ur.maxy),
    )
    m.zoom_to_box(bbox)

    meta_im = mapnik.Image(ts * META, ts * META)
    mapnik.render(m, meta_im)

    out_rows = []
    for dx in range(META):
        for dy in range(META):
            tx, ty = mx + dx, my + dy
            if tx < xmin_z or tx > xmax_z or ty < ymin_z or ty > ymax_z:
                continue
            view = meta_im.view(dx * ts, dy * ts, ts, ts)
            blob = view.tostring(FORMAT)
            out_rows.append((z, tx, xyz_to_tms_row(ty, z), blob))
    return out_rows

# --------- 메인 ----------
def main():
    ap = argparse.ArgumentParser(description="Render zmin..zmax using meta-tiles (8x8, png256, multiprocessing).")
    ap.add_argument("--xml", required=True)
    ap.add_argument("--mbtiles", required=True)
    ap.add_argument("--zmin", type=int, required=True)
    ap.add_argument("--zmax", type=int, required=True)
    ap.add_argument("--zref", type=int, help="xmin/xmax/ymin/ymax가 정의된 기준 줌 (기본: zmax)")
    ap.add_argument("--xmin", type=int, required=True, help="기준 줌에서의 xmin")
    ap.add_argument("--xmax", type=int, required=True, help="기준 줌에서의 xmax")
    ap.add_argument("--ymin", type=int, required=True, help="기준 줌에서의 ymin")
    ap.add_argument("--ymax", type=int, required=True, help="기준 줌에서의 ymax")
    ap.add_argument("--tilesize", type=int, default=TILE_SIZE)
    ap.add_argument("--bg", default="transparent")
    ap.add_argument("--workers", type=int, default=max(1, mp.cpu_count()-1))
    ap.add_argument("--commit_batch", type=int, default=8000)
    args = ap.parse_args()

    zref = args.zref if args.zref is not None else args.zmax

    # 1) 기준 줌(zref)의 타일 범위를 lon/lat 경계로 변환
    #    전체 영역: (xmin, ymax) 타일의 남서모서리 ~ (xmax, ymin) 타일의 북동모서리
    lon_min, lat_min, _, _ = tile_bounds_xyz(args.xmin, args.ymax, zref)  # SW
    _, _, lon_max, lat_max = tile_bounds_xyz(args.xmax, args.ymin, zref)  # NE

    # WebMercator 유효 범위로 클램프
    lat_min = clamp_lat(lat_min)
    lat_max = clamp_lat(lat_max)

    conn = ensure_mbtiles(args.mbtiles, name=os.path.basename(args.mbtiles))
    cur = conn.cursor()
    t0 = time.time()

    for z in range(args.zmin, args.zmax + 1):
        # 2) 각 z에 맞게 타일 범위 환산
        xmin_z, xmax_z, ymin_z, ymax_z = tile_range_for_bounds(lon_min, lat_min, lon_max, lat_max, z)
        if xmin_z > xmax_z or ymin_z > ymax_z:
            print(f"[z{z}] empty range; skip")
            continue

        # 3) 메타타일 단위로 작업 목록 생성
        tasks = []
        mx0 = (xmin_z // META) * META
        my0 = (ymin_z // META) * META
        for mx in range(mx0, xmax_z + 1, META):
            for my in range(my0, ymax_z + 1, META):
                tasks.append((z, mx, my, xmin_z, xmax_z, ymin_z, ymax_z))

        total_tiles = (xmax_z - xmin_z + 1) * (ymax_z - ymin_z + 1)
        written = 0
        pending = 0
        print(f"\n=== Rendering z={z} tiles[{xmin_z}:{xmax_z},{ymin_z}:{ymax_z}] (~{total_tiles} tiles) ===")

        with mp.Pool(
            processes=args.workers,
            initializer=worker_init,
            initargs=(args.xml, args.tilesize, args.bg),
            maxtasksperchild=50,
        ) as pool:
            for rows in pool.imap_unordered(render_meta_tile, tasks, chunksize=1):
                if not rows:
                    continue
                cur.executemany(
                    "INSERT OR REPLACE INTO tiles (zoom_level,tile_column,tile_row,tile_data) VALUES (?,?,?,?)",
                    [(zz, x, y, sqlite3.Binary(b)) for (zz, x, y, b) in rows]
                )
                pending += len(rows)
                written += len(rows)
                if pending >= args.commit_batch:
                    conn.commit()
                    print(f"[z{z}] +{pending} committed ({written}/{total_tiles}, {written/total_tiles:.1%})")
                    pending = 0
            if pending:
                conn.commit()
                print(f"[z{z}] +{pending} committed (final)")

    conn.close()
    print(f"\n✅ All zoom levels done → {args.mbtiles}  ({time.time()-t0:.1f}s)")

if __name__ == "__main__":
    mp.freeze_support()
    main()
