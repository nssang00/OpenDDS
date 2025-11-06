import argparse
import math
import sqlite3
import os
import time
import sys
from multiprocessing import Pool, cpu_count
import mapnik

METATILE = 8

# 전역 변수: 각 프로세스가 자신의 맵 객체를 유지 (fork 경로에선 부모 것이 상속됨)
_mapnik_map = None

def init_worker(mapfile, tile_size, metatile_size):
    """워커 프로세스 초기화 - 맵 객체를 한 번만 로드"""
    global _mapnik_map
    try:
        t0 = time.time()
        _mapnik_map = mapnik.Map(tile_size * metatile_size, tile_size * metatile_size)
        mapnik.load_map(_mapnik_map, mapfile)
        print(f"\nMapnik Map Loaded!! ({time.time()-t0:.1f}s)")
    except Exception as e:
        print(f"Error initializing worker: {e}")
        _mapnik_map = None


def lonlat_to_tile(lon, lat, zoom):
    """경위도(EPSG:4326)를 타일 좌표로 변환"""
    n = 2.0 ** zoom
    x = int((lon + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return x, y

def tile_to_bbox_3857(z, x, y):
    """타일 좌표를 EPSG:3857 bbox로 변환"""
    n = 2.0 ** z
    lon_min = x / n * 360.0 - 180.0
    lon_max = (x + 1) / n * 360.0 - 180.0

    lat_max = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    lat_min = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n))))

    minx = lon_min * 20037508.34 / 180.0
    maxx = lon_max * 20037508.34 / 180.0

    miny = math.log(math.tan((90 + lat_min) * math.pi / 360.0)) / (math.pi / 180.0)
    miny = miny * 20037508.34 / 180.0

    maxy = math.log(math.tan((90 + lat_max) * math.pi / 360.0)) / (math.pi / 180.0)
    maxy = maxy * 20037508.34 / 180.0

    return (minx, miny, maxx, maxy)

def bbox_to_tile_range(bbox_4326, zoom):
    """EPSG:4326 bbox 내의 모든 타일 좌표 반환"""
    minlon, minlat, maxlon, maxlat = bbox_4326
    min_x, max_y = lonlat_to_tile(minlon, minlat, zoom)
    max_x, min_y = lonlat_to_tile(maxlon, maxlat, zoom)
    return (x_min, x_max, y_min, y_max)

def get_metatiles_from_bbox(bbox_4326, zoom, metatile_size=8):
    """EPSG:4326 bbox로부터 메타타일 생성"""
    min_x, max_x, min_y, max_y = bbox_to_tile_range(bbox_4326, zoom)
    metatiles = {}
    
    for x in range(min_x, max_x + 1):
        for y in range(min_y, max_y + 1):
            meta_x = (x // metatile_size) * metatile_size
            meta_y = (y // metatile_size) * metatile_size
            meta_key = (zoom, meta_x, meta_y)
            metatiles.setdefault(meta_key, []).append((zoom, x, y))
    
    return metatiles, (max_x - min_x + 1) * (max_y - min_y + 1)

def render_metatile(args):
    """메타타일을 렌더링하고 개별 타일로 분할"""
    meta_key, tile_list, tile_size, metatile_size = args
    z, meta_x, meta_y = meta_key

    global _mapnik_map
    if _mapnik_map is None:
        print(f"Error: Map not initialized for worker")
        return []

    try:
        # 메타타일의 bbox 계산 (시작 타일과 끝 타일의 bbox를 결합)
        bbox_min = tile_to_bbox_3857(z, meta_x, meta_y)
        bbox_max = tile_to_bbox_3857(z, meta_x + metatile_size - 1, meta_y + metatile_size - 1)

        # 기존 맵 객체 재사용 - zoom_to_box만 호출
        _mapnik_map.zoom_to_box(mapnik.Box2d(bbox_min[0], bbox_min[1], bbox_max[2], bbox_max[3]))

        img = mapnik.Image(tile_size * metatile_size, tile_size * metatile_size)
        mapnik.render(_mapnik_map, img)

        tiles_data = []
        for z, x, y in tile_list:
            view = img.view((x - meta_x) * tile_size, (y - meta_y) * tile_size, tile_size, tile_size)
            tiles_data.append((z, x, y, view.tostring('png256')))
        return tiles_data

    except Exception as e:
        print(f"Error rendering metatile {meta_key}: {e}")
        return []

def setup_mbtiles(path, minzoom, maxzoom, bounds):
    """MBTiles 생성 및 스키마 초기화 + 성능 PRAGMA 적용"""
    if os.path.exists(path):
        os.unlink(path)

    conn = sqlite3.connect(path)
    cur = conn.cursor()
    cur.execute('PRAGMA journal_mode=WAL;')
    cur.execute('PRAGMA synchronous=NORMAL;')
    cur.execute('PRAGMA temp_store=MEMORY;')
    cur.execute('PRAGMA cache_size=100000;')

    cur.executescript("""
        CREATE TABLE metadata (name TEXT, value TEXT);
        CREATE TABLE tiles(zoom_level INTEGER,tile_column INTEGER,tile_row INTEGER,tile_data BLOB);
        CREATE UNIQUE INDEX name ON metadata(name);
        CREATE UNIQUE INDEX tile_index ON tiles(zoom_level,tile_column,tile_row);
    """)

    metadata = [
        ('name', os.path.basename(path).replace('.mbtiles', '')),
        ('type', 'baselayer'),
        ('version', '1'),
        ('description', 'Rendered tiles'),
        ('format', 'png'),
        ('minzoom', minzoom),
        ('maxzoom', maxzoom),
        ('bounds', bounds),
    ]
    cur.executemany("INSERT OR REPLACE INTO metadata (name, value) VALUES (?, ?);", metadata)

    conn.commit()
    conn.execute("BEGIN")
    return conn

def parse_zoom(zoom_str):
    """줌 범위 파싱 (예: '7-9' -> [7, 8, 9])"""
    if '-' in zoom_str:
        start, end = map(int, zoom_str.split('-'))
        return list(range(start, end + 1))
    else:
        return [int(zoom_str)]

def parse_bbox(bbox_str):
    """bbox 파싱 (예: 'minlon,minlat,maxlon,maxlat')"""
    return tuple(map(float, bbox_str.split(',')))

def main():
    parser = argparse.ArgumentParser(description='Mapnik 타일 렌더러 (MBTiles 출력)')
    parser.add_argument('--xml', required=True, help='Mapnik XML 맵 파일')
    parser.add_argument('--zoom', required=True, help='줌 레벨 범위 (예: 7-9)')
    parser.add_argument('--bbox', required=True, help='EPSG:4326 bbox (minlon,minlat,maxlon,maxlat)')
    parser.add_argument('--output', required=True, help='출력 MBTiles 파일')
    parser.add_argument('--tile-size', type=int, default=256, help='타일 크기 (기본: 256)')
    parser.add_argument('--processes', type=int, default=cpu_count(), help='프로세스 수')
    parser.add_argument("--xyz", action="store_true", help='Scheme (default: tms)')
    args = parser.parse_args()

    t0 = time.time()

    # 파라미터 파싱
    zooms = parse_zoom(args.zoom)
    bbox_4326 = parse_bbox(args.bbox)

    # 모든 줌 레벨의 타일 수집
    all_metatiles = []
    total_tiles = 0
    metatile_size = METATILE

    for zoom in zooms:
        metatiles, tiles_count = get_metatiles_from_bbox(bbox_4326, zoom, metatile_size)
        print(f"Zoom {zoom}: {tiles_count} tiles, {len(metatiles)} metatiles")
        total_tiles += tiles_count
        
        for meta_key, tile_list in metatiles.items():
            all_metatiles.append((meta_key, tile_list, args.tile_size, metatile_size))

    print(f"\nTotal: {total_tiles} tiles, {len(all_metatiles)} metatiles")

    conn = setup_mbtiles(args.output, zooms[0], zooms[-1], args.bbox)

    rendered = 0
    pending = 0

    is_windows = (sys.platform == "win32")
    if is_windows:
        mp.set_start_method("spawn")
    else:
        init_worker(args.xml, args.tile_size, metatile_size)

    with Pool(processes=args.processes, 
              initializer=init_worker if is_windows else None, 
              initargs=(args.xml, args.tile_size, metatile_size) if is_windows else None) as pool:
        print(f"\nTotal: {args.processes} workers Initializing...")
        for tiles_data in pool.imap_unordered(render_metatile, all_metatiles):
            if tiles_data:
                rows = []
                for z, x, y, tile_data in tiles_data:
                    tile_y = (2 ** z - 1) - y if not args.xyz else y
                    rows.append((z, x, tile_y, sqlite3.Binary(tile_data)))

                conn.executemany('INSERT OR REPLACE INTO tiles VALUES (?, ?, ?, ?)', rows)
                rendered += len(tiles_data)
                pending += len(tiles_data)

                if pending >= 1000:
                    conn.commit()
                    conn.execute("BEGIN")
                    pending = 0

                print(f"Progress: {rendered}/{total_tiles} tiles ({rendered*100//total_tiles}%)", end='\r')

    conn.commit()
    conn.close()
    print(f"\n\nComplete! {rendered} tiles rendered to {args.output} ({time.time()-t0:.1f}s)")

if __name__ == '__main__':
    main()
