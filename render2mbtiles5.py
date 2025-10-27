#!/usr/bin/env python3
import os, math, sqlite3, argparse, mapnik
import multiprocessing as mp

# Web Mercator 상수
R = 6378137.0
TILE_SIZE = 256
META_SIZE = 8
FORMAT = "png256"

def lonlat_to_merc(lon, lat):
    """경도/위도를 Web Mercator 좌표로 변환"""
    x = R * math.radians(lon)
    y = R * math.log(math.tan(math.pi/4 + math.radians(max(-85, min(85, lat)))/2))
    return x, y

def lonlat_to_tile(lon, lat, z):
    """경도/위도를 타일 좌표로 변환"""
    n = 2 ** z
    x = int((lon + 180.0) / 360.0 * n)
    y = int((1.0 - math.log(math.tan(math.radians(lat)) + 1/math.cos(math.radians(lat))) / math.pi) / 2.0 * n)
    return max(0, min(n-1, x)), max(0, min(n-1, y))

def tile_bounds(x, y, z):
    """타일의 경도/위도 바운딩 박스 계산"""
    n = 2.0 ** z
    lon0 = x / n * 360.0 - 180.0
    lon1 = (x + 1) / n * 360.0 - 180.0
    lat0 = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    lat1 = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n))))
    return lon0, lat1, lon1, lat0

def tile_to_bbox(x, y, z):
    """타일의 Web Mercator 바운딩 박스 계산"""
    min_lon, min_lat, max_lon, max_lat = tile_bounds(x, y, z)
    minx, miny = lonlat_to_merc(min_lon, min_lat)
    maxx, maxy = lonlat_to_merc(max_lon, max_lat)
    return mapnik.Box2d(minx, miny, maxx, maxy)

def xyz_to_tms_row(y, z):
    """XYZ 타일 Y를 TMS Y로 변환"""
    return (2**z - 1) - y

def parse_zoom(spec):
    """줌 레벨 파싱"""
    zs = set()
    for part in str(spec).split(","):
        if "-" in part:
            a, b = map(int, part.split("-"))
            zs.update(range(a, b + 1))
        else:
            zs.add(int(part))
    return sorted(zs)

def parse_bbox(bbox_str):
    """바운딩 박스 파싱"""
    try:
        return [float(v) for v in bbox_str.split(",")]
    except:
        raise argparse.ArgumentTypeError("Invalid --bbox: use minx,miny,maxx,maxy")

def init_mbtiles(path, name="OSM Raster", scheme="tms"):
    """MBTiles 파일 초기화"""
    new = not os.path.exists(path)
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA journal_mode=MEMORY;")
    conn.execute("PRAGMA synchronous=OFF;")
    if new:
        conn.execute("CREATE TABLE metadata (name TEXT, value TEXT);")
        conn.execute("CREATE TABLE tiles (zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER, tile_data BLOB);")
        conn.execute("CREATE UNIQUE INDEX tile_index ON tiles (zoom_level, tile_column, tile_row);")
        meta = {
            "name": name, "type": "baselayer", "version": "1",
            "description": "Rendered tiles", "format": "png",
            "minzoom": "0", "maxzoom": "22", "bounds": "-180,-85,180,85",
            "center": "0,0,2", "scheme": scheme
        }
        conn.executemany("INSERT INTO metadata (name,value) VALUES (?,?)", meta.items())
        conn.commit()
    return conn

def render_task(args, task):
    """메타타일 렌더링 (람다 대체)"""
    return render_meta_tile(args, task)

def render_meta_tile(args, task):
    """메타타일(8x8) 렌더링"""
    mx, my, z = task
    mapnik_map = mapnik.Map(TILE_SIZE * META_SIZE, TILE_SIZE * META_SIZE)
    mapnik.load_map(mapnik_map, args.xml)
    if args.bg != "transparent":
        mapnik_map.background = mapnik.Color(args.bg)

    # 메타타일 바운딩 박스
    bbox_ll = tile_to_bbox(mx, my + META_SIZE - 1, z)
    bbox_ur = tile_to_bbox(mx + META_SIZE - 1, my, z)
    bbox = mapnik.Box2d(min(bbox_ll.minx, bbox_ur.minx), min(bbox_ll.miny, bbox_ur.miny),
                        max(bbox_ll.maxx, bbox_ur.maxx), max(bbox_ll.maxy, bbox_ur.maxy))
    mapnik_map.zoom_to_box(bbox)

    # 렌더링
    image = mapnik.Image(TILE_SIZE * META_SIZE, TILE_SIZE * META_SIZE)
    mapnik.render(mapnik_map, image)

    # 타일 분할
    tiles = []
    for dx in range(META_SIZE):
        for dy in range(META_SIZE):
            tx, ty = mx + dx, my + dy
            if not (args.xmin <= tx <= args.xmax and args.ymin <= ty <= args.ymax):
                continue
            view = image.view(dx * TILE_SIZE, dy * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            y_save = xyz_to_tms_row(ty, z) if args.scheme == "tms" else ty
            tiles.append((z, tx, y_save, view.tostring(FORMAT)))
    return tiles

def main():
    parser = argparse.ArgumentParser(description="Simple MBTiles renderer with Mapnik")
    parser.add_argument("--xml", required=True, help="Mapnik XML file")
    parser.add_argument("--mbtiles", required=True, help="Output MBTiles file")
    parser.add_argument("-z", "--zoom", required=True, help="Zoom levels (e.g., 16-18 or 5,7)")
    parser.add_argument("--bbox", required=True, type=parse_bbox, help="Bounding box (minx,miny,maxx,maxy)")
    parser.add_argument("--scheme", choices=["tms", "xyz"], default="tms")
    parser.add_argument("--bg", default="transparent", help="Background color")
    parser.add_argument("--workers", type=int, default=max(4, mp.cpu_count()-1))
    args = parser.parse_args()

    # 바운딩 박스 및 줌 레벨
    minx, miny, maxx, maxy = args.bbox
    zooms = parse_zoom(args.zoom)
    conn = init_mbtiles(args.mbtiles, scheme=args.scheme)
    cur = conn.cursor()

    for z in zooms:
        # 타일 범위 계산
        x0, y0 = lonlat_to_tile(minx, maxy, z)
        x1, y1 = lonlat_to_tile(maxx, miny, z)
        args.xmin, args.ymin = min(x0, x1), min(y0, y1)
        args.xmax, args.ymax = max(x0, x1), max(y0, y1)

        # 메타타일 작업 목록
        tasks = [(mx, my, z)
                 for mx in range(args.xmin // META_SIZE * META_SIZE, args.xmax + 1, META_SIZE)
                 for my in range(args.ymin // META_SIZE * META_SIZE, args.ymax + 1, META_SIZE)]

        if not tasks:
            print(f"[z{z}] Skip (no tiles)")
            continue

        # 멀티프로세싱
        with mp.Pool(processes=args.workers) as pool:
            for tiles in pool.imap_unordered(lambda t: render_task(args, t), tasks):
                if tiles:
                    cur.executemany("INSERT OR REPLACE INTO tiles (zoom_level,tile_column,tile_row,tile_data) VALUES (?,?,?,?)",
                                    [(z, x, y, sqlite3.Binary(b)) for z, x, y, b in tiles])
                    conn.commit()
                    print(f"[z{z}] Committed {len(tiles)} tiles")

    conn.close()
    print("Done!")

if __name__ == "__main__":
    mp.freeze_support()
    main()
