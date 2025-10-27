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

def normalize_mbtiles_format(fmt: str) -> str:
    f = fmt.lower()
    if f.startswith("jpeg") or f.startswith("jpg"):
        return "jpg"
    if f.startswith("png"):
        return "png"
    if f.startswith("webp"):
        return "webp"
    return f

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
            "description": "Rendered by render_to_mbtiles_meta_mapnik.py",
            "format": normalize_mbtiles_format(fmt),  # png, jpg, webp 등
            "minzoom": "0", "maxzoom": "22",
            "bounds": "-180,-85,180,85", "center": "0,0,2",
        }.items():
            cur.execute("INSERT INTO metadata (name,value) VALUES (?,?)", (k, v))
        conn.commit()
    else:
        # 기존 파일이면 format 메타데이터를 필요 시 업데이트
        cur.execute("DELETE FROM metadata WHERE name='format';")
        cur.execute("INSERT INTO metadata (name,value) VALUES (?,?)",
                    ("format", normalize_mbtiles_format(fmt)))
        conn.commit()
    return conn

def main():
    ap = argparse.ArgumentParser(description="Render Mapnik meta-tiles (8x8) directly into MBTiles using Mapnik Image.view().")
    ap.add_argument("--xml", required=True, help="Mapnik XML path")
    ap.add_argument("--mbtiles", required=True, help="Output MBTiles path")
    ap.add_argument("--z", type=int, required=True, help="Zoom level")
    ap.add_argument("--xmin", type=int, required=True)
    ap.add_argument("--xmax", type=int, required=True)
    ap.add_argument("--ymin", type=int, required=True)
    ap.add_argument("--ymax", type=int, required=True)
    ap.add_argument("--tilesize", type=int, default=TILE_SIZE)
    ap.add_argument("--meta", type=int, default=8, help="meta tile size (e.g., 8 means 8x8)")
    ap.add_argument("--bg", default="transparent", help="Background (transparent|white|#eef...)")
    ap.add_argument("--format", default="png", help="Mapnik output format: png|png256|png8|jpeg80|webp90 ...")
    args = ap.parse_args()

    # Meta-canvas 생성
    meta_px = args.tilesize * args.meta
    m = mapnik.Map(meta_px, meta_px)
    mapnik.load_map(m, args.xml)
    if args.bg and args.bg != "transparent":
        m.background = mapnik.Color(args.bg)

    # MBTiles
    conn = ensure_mbtiles(args.mbtiles, name=os.path.basename(args.mbtiles), fmt=args.format)
    cur = conn.cursor()

    total = (args.xmax - args.xmin + 1) * (args.ymax - args.ymin + 1)
    done = 0
    t0 = time.time()

    for mx in range(args.xmin, args.xmax + 1, args.meta):
        for my in range(args.ymin, args.ymax + 1, args.meta):
            # 메타타일 bbox (좌하단~우상단을 포함)
            bbox_ll = bbox_3857_for_tile(mx, my + args.meta - 1, args.z)      # 좌하
            bbox_ur = bbox_3857_for_tile(mx + args.meta - 1, my, args.z)      # 우상
            bbox = mapnik.Box2d(
                min(bbox_ll.minx, bbox_ur.minx),
                min(bbox_ll.miny, bbox_ur.miny),
                max(bbox_ll.maxx, bbox_ur.maxx),
                max(bbox_ll.maxy, bbox_ur.maxy),
            )
            m.zoom_to_box(bbox)

            # 메타 이미지를 한 번 렌더
            meta_im = mapnik.Image(meta_px, meta_px)
            mapnik.render(m, meta_im)

            # Mapnik의 Image.view()로 256×256 조각을 잘라 바로 인코딩
            for dx in range(args.meta):
                for dy in range(args.meta):
                    tx, ty = mx + dx, my + dy
                    if tx > args.xmax or ty > args.ymax:
                        continue

                    view = meta_im.view(
                        dx * args.tilesize, dy * args.tilesize,
                        args.tilesize, args.tilesize
                    )
                    blob = view.tostring(args.format)  # png/png256/png8/jpeg80/webp90 등

                    y_tms = xyz_to_tms_row(ty, args.z)
                    cur.execute(
                        "INSERT OR REPLACE INTO tiles (zoom_level,tile_column,tile_row,tile_data) VALUES (?,?,?,?)",
                        (args.z, tx, y_tms, sqlite3.Binary(blob))
                    )
                    done += 1

            conn.commit()
            print(f"[z{args.z}] meta({mx},{my}) → {done}/{total}")

    conn.close()
    print(f"✅ Done: {total} tiles → {args.mbtiles}  ({time.time()-t0:.1f}s)")

if __name__ == "__main__":
    main()
