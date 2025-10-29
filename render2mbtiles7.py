#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, math, sqlite3, argparse, mapnik, time, multiprocessing as mp

# constants
R = 6378137.0
TILESIZE = 256
METATILE = 8

def lonlat_to_merc(lon, lat):
    x = R * math.radians(lon)
    y = R * math.log(math.tan(math.pi/4 + math.radians(lat)/2))
    return x, y

def lonlat_to_tile(lon, lat, z):
    n = 2**z
    r = math.radians(lat)
    x = int((lon + 180.0) / 360.0 * n)
    y = int((1.0 - (math.log(math.tan(r) + 1.0 / math.cos(r)) / math.pi)) / 2.0 * n)
    return max(0, min(n - 1, x)), max(0, min(n - 1, y))

def tile_bbox_3857(x, y, z):
    n = 2.0 ** z
    lon0 = x / n * 360.0 - 180.0
    lon1 = (x + 1.0) / n * 360.0 - 180.0
    lat1 = math.degrees(math.atan(math.sinh(math.pi * (1.0 - 2.0 * (y + 1.0) / n))))
    lat0 = math.degrees(math.atan(math.sinh(math.pi * (1.0 - 2.0 * y / n))))
    (minx, miny) = lonlat_to_merc(lon0, lat0)
    (maxx, maxy) = lonlat_to_merc(lon1, lat1)
    return mapnik.Box2d(minx, miny, maxx, maxy)

import math
import mapnik

def tile_to_bbox(z, x, y):
    n = 2.0 ** z
    lon_left = x / n * 360.0 - 180.0
    lat_top_rad = math.atan(math.sinh(math.pi * (1 - 2 * y / n)))
    lat_top = math.degrees(lat_top_rad)

    lon_right = (x + 1) / n * 360.0 - 180.0
    lat_bottom_rad = math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n)))
    lat_bottom = math.degrees(lat_bottom_rad)

    return mapnik.Box2d(lon_left, lat_bottom, lon_right, lat_top)

def xyz_to_tms(y, z):
    return (2**z - 1) - y

# -----------------------------
# parsing
# -----------------------------
def parse_zoom(spec):
    zs = set()
    for p in str(spec).split(","):
        if not (p := p.strip()):
            continue
        if "-" in p:
            a, b = map(int, p.split("-", 1))
            zs.update(range(a, b + 1))
        else:
            zs.add(int(p))
    return sorted(zs)

def parse_bbox(s):
    try:
        a = [float(v) for v in s.split(",")]
        if len(a) != 4:
            raise ValueError
        return a
    except:
        raise argparse.ArgumentTypeError("Invalid --bbox: minx,miny,maxx,maxy")

def parse_args():
    ap = argparse.ArgumentParser(description="Render Mapnik tiles → MBTiles (Meta 8x8)")
    ap.add_argument("--xml", required=True)
    ap.add_argument("--mbtiles", required=True)
    ap.add_argument("-z", "--zoom", required=True)
    ap.add_argument("--bbox", required=True)
    ap.add_argument("--scheme", choices=["tms", "xyz"], default="tms")
    ap.add_argument("--tilesize", type=int, default=TILESIZE)
    ap.add_argument("--commit_batch", type=int, default=1000)
    return ap.parse_args()

# -----------------------------
# mbtiles
# -----------------------------
def setup_mbtiles(path, name, scheme, minzoom, maxzoom, bounds):
    new = not os.path.exists(path)
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    cur.executescript(
        "PRAGMA journal_mode=WAL;"
        "PRAGMA synchronous=OFF;"
        "PRAGMA temp_store=MEMORY;"
    )
    if new:
        cur.executescript(
            """CREATE TABLE metadata(name TEXT,value TEXT);
               CREATE TABLE tiles(zoom_level INTEGER,tile_column INTEGER,tile_row INTEGER,tile_data BLOB);
               CREATE UNIQUE INDEX tile_index ON tiles(zoom_level,tile_column,tile_row);"""
        )
        meta = {
            "name": name,
            "type": "baselayer",
            "version": "1",
            "description": "Rendered tiles",
            "format": "png",
            "minzoom": str(minzoom),
            "maxzoom": str(maxzoom),
            "bounds": bounds,
            "scheme": scheme
        }
        for k, v in meta.items():
            cur.execute("INSERT INTO metadata (name,value) VALUES (?,?)", (k, v))
        conn.commit()
    return conn

# -----------------------------
# tiling plan
# -----------------------------
def compute_tile_window(bbox, z):
    minx, miny, maxx, maxy = bbox
    x0, y0 = lonlat_to_tile(minx, maxy, z)
    x1, y1 = lonlat_to_tile(maxx, miny, z)
    xmin, xmax = min(x0, x1), max(x0, x1)
    ymin, ymax = min(y0, y1), max(y0, y1)
    n = 2**z
    xmin = max(0, min(xmin, n - 1))
    xmax = max(0, min(xmax, n - 1))
    ymin = max(0, min(ymin, n - 1))
    ymax = max(0, min(ymax, n - 1))
    if xmin > xmax or ymin > ymax:
        return None
    return xmin, xmax, ymin, ymax, (xmax - xmin + 1) * (ymax - ymin + 1)

def meta_tasks(xmin, xmax, ymin, ymax):
    mx0 = (xmin // METATILE) * METATILE
    my0 = (ymin // METATILE) * METATILE
    mx1 = (xmax // METATILE) * METATILE
    my1 = (ymax // METATILE) * METATILE
    return [(mx, my) for mx in range(mx0, mx1 + 1, METATILE) for my in range(my0, my1 + 1, METATILE)]

# -----------------------------
# worker
# -----------------------------
_CTX = {}

def init_worker(xml, ts, z, xmin, xmax, ymin, ymax, scheme):
    m = mapnik.Map(ts * METATILE, ts * METATILE)
    mapnik.load_map(m, xml)
    _CTX.update(dict(m=m, ts=ts, z=z, xmin=xmin, xmax=xmax, ymin=ymin, ymax=ymax, scheme=scheme))

def render_meta(task):
    mx, my = task
    m, ts, z = _CTX["m"], _CTX["ts"], _CTX["z"]
    xmin, xmax, ymin, ymax, scheme = _CTX["xmin"], _CTX["xmax"], _CTX["ymin"], _CTX["ymax"], _CTX["scheme"]

    ll = tile_bbox_3857(mx, my + METATILE - 1, z)
    ur = tile_bbox_3857(mx + METATILE - 1, my, z)
    bbox = mapnik.Box2d(
        min(ll.minx, ur.minx), min(ll.miny, ur.miny),
        max(ll.maxx, ur.maxx), max(ll.maxy, ur.maxy)
    )
    m.zoom_to_box(bbox)
    im = mapnik.Image(ts * METATILE, ts * METATILE)
    mapnik.render(m, im)

    rows = []
    for dx in range(METATILE):
        for dy in range(METATILE):
            tx, ty = mx + dx, my + dy
            if not (xmin <= tx <= xmax and ymin <= ty <= ymax):
                continue
            view = im.view(dx * ts, dy * ts, ts, ts)
            ysave = xyz_to_tms(ty, z) if scheme == "tms" else ty
            rows.append((z, tx, ysave, view.tostring("png256")))
    return rows

# -----------------------------
# commit/log
# -----------------------------
def commit_progress(conn, pending, threshold, z, written, total, final=False):
    if pending >= threshold or (final and pending > 0):
        conn.commit()
        pct = (written / total) if total else 1.0
        print(f"[z{z}] +{pending} commit ({'final' if final else f'{written}/{total}, {pct:.1%}'})")
        return 0
    return pending

# -----------------------------
# per-zoom
# -----------------------------
def process_zoom(z, bbox, args, conn):
    w = compute_tile_window(bbox, z)
    if not w:
        print(f"[z{z}] Skip (no tiles)")
        return 0
    xmin, xmax, ymin, ymax, total = w
    tasks = meta_tasks(xmin, xmax, ymin, ymax)
    cur = conn.cursor()
    pending = written = 0

    procs = max(1, min((mp.cpu_count() or 1) - 1, 8))
    with mp.Pool(processes=procs, initializer=init_worker,
                 initargs=(args.xml, args.tilesize, z, xmin, xmax, ymin, ymax, args.scheme),
                 maxtasksperchild=50) as pool:
        for rows in pool.imap_unordered(render_meta, tasks, chunksize=4):
            if not rows:
                continue
            cur.executemany(
                "INSERT OR REPLACE INTO tiles(zoom_level,tile_column,tile_row,tile_data) VALUES (?,?,?,?)",
                [(z, x, y, sqlite3.Binary(b)) for (z, x, y, b) in rows]
            )
            pending += len(rows)
            written += len(rows)
            pending = commit_progress(conn, pending, args.commit_batch, z, written, total)

    commit_progress(conn, pending, args.commit_batch, z, written, total, final=True)
    print(f"[z{z}] ✅ {written}/{total}")
    return written

# -----------------------------
# main
# -----------------------------
if __name__ == "__main__":
    mp.freeze_support()
    args = parse_args()
    t0 = time.time()

    bbox = parse_bbox(args.bbox.strip())
    zooms = parse_zoom(args.zoom)

    with setup_mbtiles(args.mbtiles, os.path.basename(args.mbtiles), args.scheme, zooms[0], zooms[-1], args.bbox) as conn:
        total = sum(process_zoom(z, bbox, args, conn) for z in zooms)

    print(f"✅ Done: {total} tiles → {os.path.basename(args.mbtiles)} ({(time.time()-t0):.1f}s)")
