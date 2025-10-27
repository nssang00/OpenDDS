#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, math, sqlite3, argparse, mapnik, time
import multiprocessing as mp

# ===== 상수 =====
TILE_SIZE = 256
META = 8
FORMAT = "png256"   # mapnik encoder (png, png256, png8, jpeg80, webp90 ...)

# ===== 유틸 =====
def _y_to_lat(y, z):
    n = 2.0 ** z
    t = math.pi * (1.0 - 2.0 * y / n)
    return math.degrees(math.atan(math.sinh(t)))

def bbox_3857_for_meta(x, y, z, meta):
    """
    메타타일의 바깥 경계(edge)로 정확한 bbox 계산 (XYZ 스킴)
    [x, x+meta] × [y, y+meta]
    """
    n = 2.0 ** z
    lon_left  = x / n * 360.0 - 180.0
    lon_right = (x + meta) / n * 360.0 - 180.0
    lat_top   = _y_to_lat(y, z)             # 상단 edge
    lat_bot   = _y_to_lat(y + meta, z)      # 하단 edge

    # lon/lat → EPSG:3857
    R = 6378137.0
    minx = R * math.radians(lon_left)
    maxx = R * math.radians(lon_right)
    miny = R * math.log(math.tan(math.pi/4 + math.radians(lat_bot)/2))
    maxy = R * math.log(math.tan(math.pi/4 + math.radians(lat_top)/2))

    if minx > maxx: minx, maxx = maxx, minx
    if miny > maxy: miny, maxy = maxy, miny
    return mapnik.Box2d(minx, miny, maxx, maxy)

def xyz_to_tms_row(y, z):
    return (2**z - 1) - y

def scale_range_from_zref(xmin_ref, xmax_ref, ymin_ref, ymax_ref, zref, z):
    """
    render_list와 동일한 범위 스케일링 (입출력: XYZ)
    - 확대(dz>0): min<<dz,  max=((max+1)<<dz)-1
    - 축소(dz<0): >>(-dz)
    """
    dz = z - zref
    if dz == 0:
        xmin_z, xmax_z, ymin_z, ymax_z = xmin_ref, xmax_ref, ymin_ref, ymax_ref
    elif dz > 0:
        sh = dz
        xmin_z = xmin_ref << sh
        xmax_z = ((xmax_ref + 1) << sh) - 1
        ymin_z = ymin_ref << sh
        ymax_z = ((ymax_ref + 1) << sh) - 1
    else:
        sh = -dz
        xmin_z = xmin_ref >> sh
        xmax_z = xmax_ref >> sh
        ymin_z = ymin_ref >> sh
        ymax_z = ymax_ref >> sh

    nmax = (1 << z) - 1
    xmin_z = max(0, min(xmin_z, nmax))
    xmax_z = max(0, min(xmax_z, nmax))
    ymin_z = max(0, min(ymin_z, nmax))
    ymax_z = max(0, min(ymax_z, nmax))
    return xmin_z, xmax_z, ymin_z, ymax_z

# ===== DB =====
def ensure_mbtiles(path, name="OSM Raster", zmin=None, zmax=None):
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
            "description": "Rendered by render_to_mbtiles_meta8_mp_zrange_edge.py",
            "format": "png",  # png256도 MBTiles 메타에는 png로 표기
            "minzoom": str(zmin if zmin is not None else 0),
            "maxzoom": str(zmax if zmax is not None else 22),
            "bounds": "-180,-85,180,85",
            "center": "0,0,2",
        }
        for k, v in meta.items():
            cur.execute("INSERT INTO metadata (name,value) VALUES (?,?)", (k, v))
        conn.commit()
    else:
        if zmin is not None:
            cur.execute("DELETE FROM metadata WHERE name='minzoom';")
            cur.execute("INSERT INTO metadata (name,value) VALUES (?,?)", ("minzoom", str(zmin)))
        if zmax is not None:
            cur.execute("DELETE FROM metadata WHERE name='maxzoom';")
            cur.execute("INSERT INTO metadata (name,value) VALUES (?,?)", ("maxzoom", str(zmax)))
        conn.commit()
    return conn

# ===== 워커 =====
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

    # ✅ 메타타일 경계 기반 정확 bbox
    bbox = bbox_3857_for_meta(mx, my, z, META)
    m.resize(ts * META, ts * META)   # 안전: 렌더 타겟 크기 보정
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
            blob = view.tostring(FORMAT)  # bytes
            out_rows.append((z, tx, xyz_to_tms_row(ty, z), blob))
    return out_rows

# ===== 메인 =====
def main():
    ap = argparse.ArgumentParser(description="Render zmin..zmax using meta-tiles (8x8, png256, multiprocessing) with render_list-style scaling and edge-accurate bbox.")
    ap.add_argument("--xml", required=True)
    ap.add_argument("--mbtiles", required=True)
    ap.add_argument("--zmin", type=int, required=True)
    ap.add_argument("--zmax", type=int, required=True)
    ap.add_argument("--zref", type=int, help="xmin/xmax/ymin/ymax 기준 줌 (기본: zmax)")
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

    conn = ensure_mbtiles(args.mbtiles, name=os.path.basename(args.mbtiles),
                          zmin=args.zmin, zmax=args.zmax)
    cur = conn.cursor()
    t0 = time.time()

    for z in range(args.zmin, args.zmax + 1):
        xmin_z, xmax_z, ymin_z, ymax_z = scale_range_from_zref(
            args.xmin, args.xmax, args.ymin, args.ymax, zref, z
        )
        if xmin_z > xmax_z or ymin_z > ymax_z:
            print(f"[z{z}] empty range; skip")
            continue

        # 메타 시작 정렬
        mx0 = (xmin_z // META) * META
        my0 = (ymin_z // META) * META

        tasks = []
        for mx in range(mx0, xmax_z + 1, META):
            for my in range(my0, ymax_z + 1, META):
                tasks.append((z, mx, my, xmin_z, xmax_z, ymin_z, ymax_z))

        total_tiles = (xmax_z - xmin_z + 1) * (ymax_z - ymin_z + 1)
        print(f"\n=== z={z} === x:[{xmin_z},{xmax_z}] y:[{ymin_z},{ymax_z}] tiles≈{total_tiles}  meta_tasks={len(tasks)}")

        written = 0
        pending = 0
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
        print(f"[z{z}] done: {written}/{total_tiles} tiles")

    conn.close()
    print(f"\n✅ All zoom levels done → {args.mbtiles}  ({time.time()-t0:.1f}s)")

if __name__ == "__main__":
    mp.freeze_support()
    main()
