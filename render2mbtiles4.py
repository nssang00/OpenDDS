#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, math, sqlite3, argparse, mapnik, time
import multiprocessing as mp

# --------- 상수 ---------
TILE_SIZE = 256
R = 6378137.0
META = 8
FORMAT = "png256"   # mapnik encoder: png, png256, png8, jpeg80, webp90 ...

# --------- 좌표/타일 유틸 ---------
WEBMERC_MAX_LAT = 85.05112878

def clamp_lat_mercator(lat):
    return max(-WEBMERC_MAX_LAT, min(WEBMERC_MAX_LAT, lat))

def lonlat_to_merc(lon, lat):
    x = R * math.radians(lon)
    y = R * math.log(math.tan(math.pi/4 + math.radians(lat)/2))
    return x, y

def merc_to_lonlat(mx, my):
    lon = (mx / R) * 180.0 / math.pi
    lat = (2 * math.atan(math.exp(my / R)) - math.pi/2) * 180.0 / math.pi
    return lon, lat

def lonlat_to_tile_xy(lon, lat, z):
    lat = clamp_lat_mercator(lat)
    n = 2 ** z
    x = int((lon + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    y = int((1.0 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2.0 * n)
    return max(0, min(n-1, x)), max(0, min(n-1, y))

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

def coords_to_tile_range(minx, miny, maxx, maxy, z, crs):
    # 입력 좌표계를 4326으로 변환 후 타일 범위 계산
    if crs == "3857":
        lon_min, lat_min = merc_to_lonlat(minx, miny)
        lon_max, lat_max = merc_to_lonlat(maxx, maxy)
    else:  # "4326"
        lon_min, lat_min = minx, miny
        lon_max, lat_max = maxx, maxy

    lon0, lon1 = sorted([lon_min, lon_max])
    lat0, lat1 = sorted([lat_min, lat_max])

    x0, y0 = lonlat_to_tile_xy(lon0, lat1, z)
    x1, y1 = lonlat_to_tile_xy(lon1, lat0, z)
    return min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)

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
            "format": "png",
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
    mx, my = task
    m   = _worker_ctx["map"]
    ts  = _worker_ctx["tilesize"]
    z   = _worker_ctx["z"]
    xmin = _worker_ctx["xmin"]
    xmax = _worker_ctx["xmax"]
    ymin = _worker_ctx["ymin"]
    ymax = _worker_ctx["ymax"]

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
            if tx < xmin or tx > xmax or ty < ymin or ty > ymax:
                continue
            view = meta_im.view(dx * ts, dy * ts, ts, ts)
            blob = view.tostring(FORMAT)
            out_rows.append((z, tx, xyz_to_tms_row(ty, z), blob))
    return out_rows

# --------- 유틸 ---------
def parse_zoom_spec(spec):
    zs = set()
    for part in str(spec).split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            zs.update(range(int(a), int(b) + 1))
        else:
            zs.add(int(part))
    return sorted(zs)

# --------- 메인 ---------
def main():
    ap = argparse.ArgumentParser(description="Meta-tile renderer (8x8, png256) with multiprocess and coordinate bbox input.")
    ap.add_argument("--xml", required=True)
    ap.add_argument("--mbtiles", required=True)
    ap.add_argument("-z", "--zoom", required=True, help="Zoom levels, e.g. 16-18 or 5,7,9")
    ap.add_argument("--coords", nargs=4, type=float, required=True, metavar=("MINX","MINY","MAXX","MAXY"),
                    help="Bounding box in coordinate units.")
    ap.add_argument("--crs", choices=["4326","3857"], default="4326",
                    help="CRS of input coords (default: 4326)")
    ap.add_argument("--tilesize", type=int, default=TILE_SIZE)
    ap.add_argument("--bg", default="transparent")
    ap.add_argument("--workers", type=int, default=max(1, mp.cpu_count()-1))
    ap.add_argument("--commit_batch", type=int, default=4000)
    args = ap.parse_args()

    zooms = parse_zoom_spec(args.zoom)
    minx, miny, maxx, maxy = args.coords
    conn = ensure_mbtiles(args.mbtiles, name=os.path.basename(args.mbtiles))
    cur = conn.cursor()
    t0 = time.time()
    total_written = 0

    for z in zooms:
        xmin, ymin, xmax, ymax = coords_to_tile_range(minx, miny, maxx, maxy, z, args.crs)
        mx_start = (xmin // META) * META
        my_start = (ymin // META) * META
        mx_end   = (xmax // META) * META
        my_end   = (ymax // META) * META
        tasks = [(mx, my)
                 for mx in range(mx_start, mx_end + 1, META)
                 for my in range(my_start, my_end + 1, META)]

        total_tiles = (xmax - xmin + 1) * (ymax - ymin + 1)
        if total_tiles <= 0:
            print(f"[z{z}] skip (empty range)")
            continue

        with mp.Pool(
            processes=args.workers,
            initializer=worker_init,
            initargs=(args.xml, args.tilesize, z, args.bg, xmin, xmax, ymin, ymax),
            maxtasksperchild=50,
        ) as pool:
            pending = written = 0
            for rows in pool.imap_unordered(render_meta_tile, tasks, chunksize=1):
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
                    print(f"[z{z}] +{pending} committed ({written}/{total_tiles}, {written/total_tiles:.1%})")
                    pending = 0
            if pending:
                conn.commit()
                print(f"[z{z}] +{pending} committed (final)")

        total_written += written
        print(f"[z{z}] ✅ {written}/{total_tiles} tiles")

    conn.close()
    print(f"✅ Done: {total_written} tiles → {args.mbtiles}  ({time.time()-t0:.1f}s)")

if __name__ == "__main__":
    mp.freeze_support()
    main()


```
python render_to_mbtiles_meta8_mp.py \
  --xml style.xml \
  --mbtiles out.mbtiles \
  -z 14-16 \
  --coords 126.8 37.4 127.2 37.7 \
  --crs 4326
```
