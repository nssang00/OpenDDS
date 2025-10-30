#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import math
import sqlite3
import os
from multiprocessing import Pool, cpu_count
import mapnik

METATILE = 8

# ----------------------------------------------------------------------
#  프로세스 로컬 저장소 (worker 별 한 번만 생성되는 Map 객체)
# ----------------------------------------------------------------------
_process_local_map = None


def lonlat_to_tile(lon, lat, zoom):
    """경위도(EPSG:4326)를 타일 좌표로 변환"""
    n = 2.0 ** zoom
    x = int((lon + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return x, y


def tile_to_bbox_3857(z, x, y):
    """타일 좌표를 EPSG:3857 bbox 로 변환"""
    n = 2.0 ** z

    lon_min = x / n * 360.0 - 180.0
    lon_max = (x + 1) / n * 360.0 - 180.0

    lat_max_rad = math.atan(math.sinh(math.pi * (1 - 2 * y / n)))
    lat_max = math.degrees(lat_max_rad)

    lat_min_rad = math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n)))
    lat_min = math.degrees(lat_min_rad)

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


# ----------------------------------------------------------------------
#  Worker 초기화 (프로세스당 한 번)
# ----------------------------------------------------------------------
def init_worker(mapfile, tile_size, metatile_size):
    """각 프로세스 시작 시 Mapnik 맵을 한 번만 로드"""
    global _process_local_map
    try:
        width = tile_size * metatile_size
        height = tile_size * metatile_size
        m = mapnik.Map(width, height)
        mapnik.load_map(m, mapfile)
        _process_local_map = m
        print(f"[PID {os.getpid()}] Map loaded from {mapfile}")
    except Exception as e:
        print(f"[PID {os.getpid()}] Failed to load map: {e}")
        raise


# ----------------------------------------------------------------------
#  메타타일 렌더링 (맵 객체 재사용)
# ----------------------------------------------------------------------
def render_metatile_optimized(args):
    """메타타일을 렌더링하고 개별 타일로 분할 (맵 재사용)"""
    global _process_local_map
    meta_key, tile_list, tile_size, metatile_size = args
    z, meta_x, meta_y = meta_key

    if _process_local_map is None:
        raise RuntimeError("Map not initialized in this worker")

    try:
        # 메타타일 전체 bbox
        bbox_min = tile_to_bbox_3857(z, meta_x, meta_y)
        bbox_max = tile_to_bbox_3857(z, meta_x + metatile_size - 1,
                                    meta_y + metatile_size - 1)

        minx, miny = bbox_min[0], bbox_min[1]
        maxx, maxy = bbox_max[2], bbox_max[3]

        m = _process_local_map
        # 크기가 바뀔 경우를 대비해 resize (대부분은 동일)
        m.resize(tile_size * metatile_size, tile_size * metatile_size)
        m.zoom_to_box(mapnik.Box2d(minx, miny, maxx, maxy))

        img = mapnik.Image(tile_size * metatile_size, tile_size * metatile_size)
        mapnik.render(m, img)

        tiles_data = []
        for tz, tx, ty in tile_list:
            off_x = (tx - meta_x) * tile_size
            off_y = (ty - meta_y) * tile_size
            tile_img = img.view(off_x, off_y, tile_size, tile_size)
            tile_data = tile_img.tostring('png256')
            tiles_data.append((tz, tx, ty, tile_data))

        return tiles_data

    except Exception as e:
        print(f"Error rendering metatile {meta_key}: {e}")
        return []


# ----------------------------------------------------------------------
#  MBTiles 헬퍼
# ----------------------------------------------------------------------
def create_mbtiles(filename):
    """MBTiles DB 생성 + 성능 PRAGMA"""
    conn = sqlite3.connect(filename, timeout=120)
    conn.execute('PRAGMA journal_mode=WAL;')
    conn.execute('PRAGMA synchronous=NORMAL;')
    conn.execute('PRAGMA temp_store=MEMORY;')
    conn.execute('PRAGMA cache_size = -2000000;')   # ~2 GB 캐시 (필요시 조정)

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
    conn.execute('INSERT OR REPLACE INTO metadata VALUES (?, ?)', (name, value))
    conn.commit()


def insert_tiles_batch(conn, tiles_data):
    """배치 삽입 (TMS Y축 반전) – 한 번에 executemany + commit"""
    rows = []
    for z, x, y, data in tiles_data:
        tms_y = (2 ** z - 1) - y
        rows.append((z, x, tms_y, sqlite3.Binary(data)))

    conn.executemany(
        'INSERT OR REPLACE INTO tiles VALUES (?, ?, ?, ?)',
        rows
    )
    conn.commit()


# ----------------------------------------------------------------------
#  파싱 헬퍼
# ----------------------------------------------------------------------
def parse_zoom_range(zoom_str):
    if '-' in zoom_str:
        start, end = map(int, zoom_str.split('-'))
        return list(range(start, end + 1))
    else:
        return [int(zoom_str)]


def parse_bbox(bbox_str):
    return tuple(map(float, bbox_str.split(',')))


# ----------------------------------------------------------------------
#  메인
# ----------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description='Mapnik 타일 렌더러 → MBTiles (맵 재사용 최적화)')
    parser.add_argument('--xml', required=True, help='Mapnik XML 맵 파일')
    parser.add_argument('--zoom', required=True, help='줌 레벨 범위 (예: 7-9)')
    parser.add_argument('--bbox', required=True,
                        help='EPSG:4326 bbox (minlon,minlat,maxlon,maxlat)')
    parser.add_argument('--output', required=True, help='출력 MBTiles 파일')
    parser.add_argument('--tile-size', type=int, default=256, help='타일 크기 (기본 256)')
    parser.add_argument('--metatile-size', type=int, default=8,
                        help='메타타일 크기 (기본 8x8)')
    parser.add_argument('--processes', type=int, default=cpu_count(),
                        help='병렬 프로세스 수 (기본 CPU 코어 수)')

    args = parser.parse_args()

    # 파라미터
    zoom_levels = parse_zoom_range(args.zoom)
    bbox_4326 = parse_bbox(args.bbox)

    # 모든 메타타일 수집 (XML·size 는 worker 초기화 시 전달)
    all_metatiles = []
    total_tiles = 0

    for zoom in zoom_levels:
        tiles = get_tiles_in_bbox(bbox_4326, zoom)
        metatiles = get_metatiles(tiles, args.metatile_size)

        print(f"Zoom {zoom}: {len(tiles)} tiles, {len(metatiles)} metatiles")
        total_tiles += len(tiles)

        for meta_key, tile_list in metatiles.items():
            # (meta_key, tile_list, tile_size, metatile_size) 만 전달
            all_metatiles.append((meta_key, tile_list,
                                  args.tile_size, args.metatile_size))

    print(f"\nTotal: {total_tiles} tiles, {len(all_metatiles)} metatiles")

    # MBTiles 생성
    conn = create_mbtiles(args.output)

    # 메타데이터
    set_metadata(conn, 'name', os.path.basename(args.output).split('.')[0])
    set_metadata(conn, 'type', 'baselayer')
    set_metadata(conn, 'version', '1.0')
    set_metadata(conn, 'description', 'Generated by Mapnik tile renderer (optimized)')
    set_metadata(conn, 'format', 'png')
    set_metadata(conn, 'bounds',
                 f"{bbox_4326[0]},{bbox_4326[1]},{bbox_4326[2]},{bbox_4326[3]}")

    # 렌더링
    print("\nRendering tiles...")
    rendered = 0

    with Pool(
        processes=args.processes,
        initializer=init_worker,
        initargs=(args.xml, args.tile_size, args.metatile_size)
    ) as pool:
        for tiles_data in pool.imap_unordered(render_metatile_optimized, all_metatiles):
            if tiles_data:
                insert_tiles_batch(conn, tiles_data)
                rendered += len(tiles_data)
                print(f"Progress: {rendered}/{total_tiles} tiles "
                      f"({rendered * 100 // total_tiles}%)", end='\r')

    conn.close()
    print(f"\n\nComplete! {rendered} tiles saved to {args.output}")


if __name__ == '__main__':
    main()
