#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, math, sqlite3, argparse, mapnik, time
from io import BytesIO
from PIL import Image

TILE_SIZE = 256
R = 6378137.0

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

def ensure_mbtiles(path, name="OSM Raster", fmt="png"):
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
        for k, v in {
            "name": name, "type": "baselayer", "version": "1",
            "description": "Rendered by render_to_mbtiles_meta.py",
            "format": fmt, "minzoom": "0", "maxzoom": "22",
            "bounds": "-180,-85,180,85", "center": "0,0,2",
        }.items():
            cur.execute("INSERT INTO metadata (name,value) VALUES (?,?)", (k, v))
        conn.commit()
    return conn

def main():
    ap = argparse.ArgumentParser(description="Render Mapnik meta-tiles (8x8) directly into MBTiles.")
    ap.add_argument("--xml", required=True)
    ap.add_argument("--mbtiles", required=True)
    ap.add_argument("--z", type=int, required=True)
    ap.add_argument("--xmin", type=int, required=True)
    ap.add_argument("--xmax", type=int, required=True)
    ap.add_argument("--ymin", type=int, required=True)
    ap.add_argument("--ymax", type=int, required=True)
    ap.add_argument("--tilesize", type=int, default=TILE_SIZE)
    ap.add_argument("--meta", type=int, default=8, help="meta tile size (e.g., 8 means 8x8)")
    ap.add_argument("--bg", default="transparent")
    args = ap.parse_args()

    m = mapnik.Map(args.tilesize * args.meta, args.tilesize * args.meta)
    mapnik.load_map(m, args.xml)
    if args.bg and args.bg != "transparent":
        m.background = mapnik.Color(args.bg)

    conn = ensure_mbtiles(args.mbtiles, name=os.path.basename(args.mbtiles))
    cur = conn.cursor()

    total = (args.xmax - args.xmin + 1) * (args.ymax - args.ymin + 1)
    done = 0
    t0 = time.time()

    for mx in range(args.xmin, args.xmax + 1, args.meta):
        for my in range(args.ymin, args.ymax + 1, args.meta):
            # 전체 메타타일 영역 계산
            bbox = bbox_3857_for_tile(mx, my + args.meta - 1, args.z)
            bbox.expand_to_include(bbox_3857_for_tile(mx + args.meta - 1, my, args.z))
            m.zoom_to_box(bbox)

            im = mapnik.Image(args.tilesize * args.meta, args.tilesize * args.meta)
            mapnik.render(m, im)
            meta_png = im.tostring("png")

            # PIL로 나누기
            meta_img = Image.open(BytesIO(meta_png))
            for dx in range(args.meta):
                for dy in range(args.meta):
                    tx, ty = mx + dx, my + dy
                    if tx > args.xmax or ty > args.ymax:
                        continue
                    tile_img = meta_img.crop((
                        dx * args.tilesize,
                        dy * args.tilesize,
                        (dx + 1) * args.tilesize,
                        (dy + 1) * args.tilesize
                    ))
                    buf = BytesIO()
                    tile_img.save(buf, format="PNG")
                    y_tms = xyz_to_tms_row(ty, args.z)
                    cur.execute(
                        "INSERT OR REPLACE INTO tiles (zoom_level,tile_column,tile_row,tile_data) VALUES (?,?,?,?)",
                        (args.z, tx, y_tms, sqlite3.Binary(buf.getvalue()))
                    )
                    done += 1
            conn.commit()
            print(f"[z{args.z}] ({mx},{my}) meta rendered → {done}/{total}")

    conn.close()
    print(f"✅ Done: {total} tiles ({time.time()-t0:.1f}s)")

if __name__ == "__main__":
    main()
