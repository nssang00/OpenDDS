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
def tile_bounds_xyz(x, y, z):
    n = 2.0 ** z
    lon_left  = x / n * 360.0 - 180.0
    lon_right = (x + 1) / n * 360.0 - 180.0
    lat_top   = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    lat_bot   = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n))))
    return lon_left, lat_bot, lon_right, lat_top

def bbox_3857_for_tile(x, y, z):
    # XYZ 타일 1장의 경계로부터 3857 박스
    def lonlat_to_merc(lon, lat):
        R = 6378137.0
        x = R * math.radians(lon)
        y = R * math.log(math.tan(math.pi/4 + math.radians(lat)/2))
        return x, y
    min_lon, min_lat, max_lon, max_lat = tile_bounds_xyz(x, y, z)
    minx, miny = lonlat_to_merc(min_lon, min_lat)
    maxx, maxy = lonlat_to_merc(max_lon, max_lat)
    return mapnik.Box2d(minx, miny, maxx, maxy)

def xyz_to_tms_row(y, z):
    return (2**z - 1) - y

# --------- DB ----------
def ensure_mbtiles(path, name="OSM Raster"):
    new = not os.path.exists(path)
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    # 빠른 쓰기 세팅
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
            "description": "Rendered by render_to_mbtiles_meta8_mp_zrange_refscale.py",
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

# --------- zref → z 범위 스케일링 (render_list 방식) ----------
def scale_range_from_zref(xmin_ref, xmax_ref, ymin_ref, ymax_ref, zref, z):
    """
    입력/출력 모두 XYZ 스킴.
    - 입력: 기준 줌 zref 에서의 타일 범위 (xmin..xmax, ymin..ymax)
    - 출력: 목표 줌 z 에서의 타일 범위
    """
    dz = z - zref
    if dz == 0:
        return xmin_ref, xmax_ref, ymin_ref, ymax_ref

    if dz > 0:
        # 확대: 각 최소는 <<, 각 최대는 (max+1)<< - 1
        shift = dz
        xmin_z = xmin_ref << shift
        xmax_z = ((xmax_ref + 1) << shift) - 1
        ymin_z = ymin_ref << shift
        ymax_z = ((ymax_ref + 1) << shift) - 1
    else:
        # 축소: >> (그냥 비트시프트)
        shift = -dz
        xmin_z = xmin_ref >> shift
        xmax_z = xmax_ref >> shift
        ymin_z = ymin_ref >> shift
        ymax_z = ymax_ref >> shift

    # 합리적 클램프
    nmax = (1 << z) - 1
    xmin_z = max(0, min(xmin_z, nmax))
    xmax_z = max(0, min(xmax_z, nmax))
    ymin_z = max(0, min(ymin_z, nmax))
    ymax_z = max(0, min(ymax_z, nmax))
    return xmin_z, xmax_z, ymin_z, ymax_z

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

    # 메타타일 전체 bbox로 한 번 렌더
    bbox_ll = bbox_3857_for_tile(mx, my + META - 1, z)          # 좌하
    bbox_ur = bbox_3857_for_tile(mx + META - 1, my, z)          # 우상
    bbox = mapnik.Box2d(
        min(bbox_ll.minx, bbox_ur.minx),
        min(bbox_ll.miny, bbox_ur.miny),
        max(bbox_ll.maxx, bbox_ur.maxx),
        max(bbox_ll.maxy, bbox_ur.maxy),
    )
    m.zoom_to_box(bbox)

    meta_im = mapnik.Image(ts * META, ts * META)
    mapnik.render(m, meta_im)

    # 메타 이미지에서 256 타일로 분할 (XYZ 좌표계)
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
    ap = argparse.ArgumentParser(description="Render zmin..zmax using meta-tiles (8x8, png256, multiprocessing) with render_list-style zref scaling.")
    ap.add_argument("--xml", required=True)
    ap.add_argument("--mbtiles", required=True)
    ap.add_argument("--zmin", type=int, required=True)
    ap.add_argument("--zmax", type=int, required=True)
    ap.add_argument("--zref", type=int, help="xmin/xmax/ymin/ymax 가 정의된 기준 줌 (기본: zmax)")
    ap.add_argument("--xmin", type=int, required=True, help="기준 줌(zref)의 xmin (XYZ)")
    ap.add_argument("--xmax", type=int, required=True, help="기준 줌(zref)의 xmax (XYZ)")
    ap.add_argument("--ymin", type=int, required=True, help="기준 줌(zref)의 ymin (XYZ)")
    ap.add_argument("--ymax", type=int, required=True, help="기준 줌(zref)의 ymax (XYZ)")
    ap.add_argument("--tilesize", type=int, default=TILE_SIZE)
    ap.add_argument("--bg", default="transparent")
    ap.add_argument("--workers", type=int, default=max(1, mp.cpu_count()-1))
    ap.add_argument("--commit_batch", type=int, default=8000)
    args = ap.parse_args()

    zref = args.zref if args.zref is not None else args.zmax

    conn = ensure_mbtiles(args.mbtiles, name=os.path.basename(args.mbtiles))
    cur = conn.cursor()
    t0 = time.time()

    for z in range(args.zmin, args.zmax + 1):
        xmin_z, xmax_z, ymin_z, ymax_z = scale_range_from_zref(
            args.xmin, args.xmax, args.ymin, args.ymax, zref, z
        )
        if xmin_z > xmax_z or ymin_z > ymax_z:
            print(f"[z{z}] empty range; skip")
            continue

        # 메타 타일 그리드에 맞춰 시작점 정렬
        mx0 = (xmin_z // META) * META
        my0 = (ymin_z // META) * META

        tasks = []
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
