import argparse
import math
import sqlite3
import os
from multiprocessing import Pool, cpu_count
import mapnik

METATILE=8

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
    lat_min_rad = math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n)))
    lat_min = math.degrees(lat_min_rad)
    
    lon_max = (x + 1) / n * 360.0 - 180.0
    lat_max_rad = math.atan(math.sinh(math.pi * (1 - 2 * y / n)))
    lat_max = math.degrees(lat_max_rad)
    
    minx = lon_min * 20037508.34 / 180.0
    maxx = lon_max * 20037508.34 / 180.0
    
    miny = math.log(math.tan((90 + lat_min) * math.pi / 360.0)) / (math.pi / 180.0)
    miny = miny * 20037508.34 / 180.0
    
    maxy = math.log(math.tan((90 + lat_max) * math.pi / 360.0)) / (math.pi / 180.0)
    maxy = maxy * 20037508.34 / 180.0
    
    return (minx, miny, maxx, maxy)


def get_tiles_in_bbox(bbox_4326, zoom):
    """EPSG:4326 bbox 내의 모든 타일 좌표 반환"""
    minlon, minlat, maxlon, maxlat = bbox_4326
    
    min_x, max_y = lonlat_to_tile(minlon, minlat, zoom)
    max_x, min_y = lonlat_to_tile(maxlon, maxlat, zoom)
    
    tiles = []
    for x in range(min_x, max_x + 1):
        for y in range(min_y, max_y + 1):
            tiles.append((zoom, x, y))
    
    return tiles


def get_metatiles(tiles, metatile_size=8):
    """타일 목록을 메타타일로 그룹화"""
    metatiles = {}
    
    for z, x, y in tiles:
        meta_x = (x // metatile_size) * metatile_size
        meta_y = (y // metatile_size) * metatile_size
        meta_key = (z, meta_x, meta_y)
        
        if meta_key not in metatiles:
            metatiles[meta_key] = []
        metatiles[meta_key].append((z, x, y))
    
    return metatiles


def render_metatile(args):
    """메타타일을 렌더링하고 개별 타일로 분할"""
    meta_key, tile_list, mapfile, tile_size, metatile_size = args
    z, meta_x, meta_y = meta_key
    
    try:
        # Mapnik 맵 객체 생성
        m = mapnik.Map(tile_size * metatile_size, tile_size * metatile_size)
        mapnik.load_map(m, mapfile)
        
        # 메타타일의 bbox 계산
        bbox = tile_to_bbox_3857(z, meta_x, meta_y)
        minx, miny, maxx, maxy = bbox
        
        # 메타타일 크기만큼 확장
        width = (maxx - minx) * metatile_size
        height = (maxy - miny) * metatile_size
        
        m.zoom_to_box(mapnik.Box2d(minx, miny, minx + width, miny + height))
        
        # 렌더링
        img = mapnik.Image(tile_size * metatile_size, tile_size * metatile_size)
        mapnik.render(m, img)
        
        # 개별 타일로 분할
        tiles_data = []
        for z, x, y in tile_list:
            offset_x = (x - meta_x) * tile_size
            offset_y = (y - meta_y) * tile_size
            
            # 타일 영역 추출
            tile_img = img.view(offset_x, offset_y, tile_size, tile_size)
            
            # PNG로 인코딩
            tile_data = tile_img.tostring('png256')
            tiles_data.append((z, x, y, tile_data))
        
        return tiles_data
        
    except Exception as e:
        print(f"Error rendering metatile {meta_key}: {e}")
        return []


def create_mbtiles(filename):
    """MBTiles 데이터베이스 생성 및 스키마 초기화 + 성능 PRAGMA 적용"""
    # timeout을 넉넉히 (WAL에서도 체크포인트 타이밍 등으로 잠깐 대기할 수 있음)
    conn = sqlite3.connect(filename, timeout=120)

    conn.execute('PRAGMA journal_mode=WAL;')
    conn.execute('PRAGMA synchronous=NORMAL;')
    conn.execute('PRAGMA temp_store=MEMORY;')

    # 스키마
    conn.execute('''
        CREATE TABLE IF NOT EXISTS metadata (name TEXT, value TEXT)
    ''')

    conn.execute('''
        CREATE TABLE IF NOT EXISTS tiles (
            zoom_level INTEGER,
            tile_column INTEGER,
            tile_row INTEGER,
            tile_data BLOB,
            PRIMARY KEY (zoom_level, tile_column, tile_row)
        )
    ''')

    conn.commit()
    return conn


def set_metadata(conn, name, value):
    """메타데이터 설정"""
    conn.execute('INSERT OR REPLACE INTO metadata VALUES (?, ?)', (name, value))
    conn.commit()


def insert_tile(conn, z, x, y, tile_data):
    """타일 삽입 (TMS 좌표계로 변환)"""
    # XYZ를 TMS로 변환 (Y축 반전)
    tms_y = (2 ** z - 1) - y
    
    conn.execute(
        'INSERT OR REPLACE INTO tiles VALUES (?, ?, ?, ?)',
        (z, x, tms_y, sqlite3.Binary(tile_data))
    )


def insert_tiles_batch(conn, tiles_data):
    """여러 타일을 배치로 삽입"""
    for z, x, y, tile_data in tiles_data:
        insert_tile(conn, z, x, y, tile_data)
    conn.commit()

def insert_tiles_batch(conn, tiles_data):
    """여러 타일을 배치로 삽입 (한 트랜잭션)"""
    rows = []
    for z, x, y, tile_data in tiles_data:
        tms_y = (2 ** z - 1) - y
        rows.append((z, x, tms_y, sqlite3.Binary(tile_data)))

    # executemany로 일괄 삽입 후 1회 커밋
    conn.executemany(
        'INSERT OR REPLACE INTO tiles VALUES (?, ?, ?, ?)',
        rows
    )
    conn.commit()


def parse_zoom_range(zoom_str):
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
    parser.add_argument('--metatile-size', type=int, default=8, help='메타타일 크기 (기본: 8x8)')
    parser.add_argument('--processes', type=int, default=cpu_count(), help='프로세스 수')
    
    args = parser.parse_args()
    
    # 파라미터 파싱
    zoom_levels = parse_zoom_range(args.zoom)
    bbox_4326 = parse_bbox(args.bbox)
    
    # 모든 줌 레벨의 타일 수집
    all_metatiles = []
    total_tiles = 0
    metatile_size = METATILE
    
    for zoom in zoom_levels:
        tiles = get_tiles_in_bbox(bbox_4326, zoom)
        metatiles = get_metatiles(tiles, args.metatile_size)
        
        print(f"Zoom {zoom}: {len(tiles)} tiles, {len(metatiles)} metatiles")
        total_tiles += len(tiles)
        
        for meta_key, tile_list in metatiles.items():
            all_metatiles.append((meta_key, tile_list, args.xml, 
                                 args.tile_size, args.metatile_size))
    
    print(f"\nTotal: {total_tiles} tiles, {len(all_metatiles)} metatiles")
    
    # MBTiles 파일 생성
    conn = create_mbtiles(args.output)
    
    # 메타데이터 설정
    set_metadata(conn, 'name', os.path.basename(args.output))
    set_metadata(conn, 'type', 'baselayer')
    set_metadata(conn, 'version', '1.0')
    set_metadata(conn, 'description', 'Generated by Mapnik tile renderer')
    set_metadata(conn, 'format', 'png')
    set_metadata(conn, 'bounds', f"{bbox_4326[0]},{bbox_4326[1]},{bbox_4326[2]},{bbox_4326[3]}")
    
    print("\nRendering tiles...")
    rendered = 0
    
    with Pool(processes=args.processes) as pool:
        for tiles_data in pool.imap_unordered(render_metatile, all_metatiles):
            if tiles_data:
                insert_tiles_batch(conn, tiles_data)
                rendered += len(tiles_data)
                print(f"Progress: {rendered}/{total_tiles} tiles ({rendered*100//total_tiles}%)", end='\r')
    
    conn.close()
    print(f"\n\nComplete! {rendered} tiles rendered to {args.output}")


if __name__ == '__main__':
    main()
