#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, math, sqlite3, argparse, mapnik, time

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
    return (2**z - 1) - y  # MBTiles는 TMS 스킴

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
            "description": "Rendered by render_to_mbtiles_min.py",
            "format": fmt, "minzoom": "0", "maxzoom": "22",
            "bounds": "-180,-85,180,85", "center": "0,0,2",
        }.items():
            cur.execute("INSERT INTO metadata (name,value) VALUES (?,?)", (k, v))
        conn.commit()
    return conn

def main():
    ap = argparse.ArgumentParser(description="Render Mapnik tiles directly into MBTiles (XYZ input).")
    ap.add_argument("--xml", required=True, help="Mapnik XML path")
    ap.add_argument("--mbtiles", required=True, help="Output MBTiles path")
    ap.add_argument("--z", type=int, required=True, help="Zoom level")
    ap.add_argument("--xmin", type=int, required=True)
    ap.add_argument("--xmax", type=int, required=True)
    ap.add_argument("--ymin", type=int, required=True)
    ap.add_argument("--ymax", type=int, required=True)
    ap.add_argument("--tilesize", type=int, default=TILE_SIZE)
    ap.add_argument("--bg", default="transparent", help="Background (transparent|white|#eef...)")
    args = ap.parse_args()

    # Map
    m = mapnik.Map(args.tilesize, args.tilesize)
    mapnik.load_map(m, args.xml)
    if args.bg and args.bg != "transparent":
        m.background = mapnik.Color(args.bg)

    # MBTiles
    conn = ensure_mbtiles(args.mbtiles, name=os.path.basename(args.mbtiles))
    cur = conn.cursor()

    t0 = time.time()
    total = (args.xmax - args.xmin + 1) * (args.ymax - args.ymin + 1)
    done = 0

    for x in range(args.xmin, args.xmax + 1):
        for y in range(args.ymin, args.ymax + 1):
            bbox = bbox_3857_for_tile(x, y, args.z)
            m.zoom_to_box(bbox)
            im = mapnik.Image(args.tilesize, args.tilesize)
            mapnik.render(m, im)
            png = im.tostring("png")

            y_tms = xyz_to_tms_row(y, args.z)
            cur.execute(
                "INSERT OR REPLACE INTO tiles (zoom_level,tile_column,tile_row,tile_data) VALUES (?,?,?,?)",
                (args.z, x, y_tms, sqlite3.Binary(png))
            )
            done += 1
            if done % 200 == 0 or done == total:
                conn.commit()
                print(f"[z{args.z}] {done}/{total} tiles")

    conn.commit()
    conn.close()
    print(f"✅ Done: {total} tiles → {args.mbtiles}  ({time.time()-t0:.1f}s)")

if __name__ == "__main__":
    main()

#python3 render_to_mbtiles_min.py \
  --xml /path/to/mapnik.xml \
  --mbtiles seoul_z17.mbtiles \
  --z 17 \
  --xmin 111752 --xmax 111783 \
  --ymin 50755  --ymax 50784
