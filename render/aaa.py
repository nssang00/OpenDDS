import sqlite3
import mercantile
import requests
from io import BytesIO
import os
import sys

# ================== 설정 ==================
WEST, SOUTH, EAST, NORTH = 126.9, 37.5, 127.0, 37.6  # 서울 일부
MIN_ZOOM = 10
MAX_ZOOM = 14

MBTILES_PATH = "seoul_example.mbtiles"
TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"

HEADERS = {
    "User-Agent": "MBTiles Generator (+your-email@example.com)"
}
# ===========================================


def create_mbtiles(db_path):
    """MBTiles DB 생성 + 성능 최적화 PRAGMA 설정"""
    conn = sqlite3.connect(db_path, isolation_level=None)  # autocommit 모드
    cur = conn.cursor()

    # ===== 성능 최적화 PRAGMA =====
    cur.execute("PRAGMA journal_mode = WAL;")      # WAL 모드 (동시성 ↑)
    cur.execute("PRAGMA synchronous = NORMAL;")    # 쓰기 속도 ↑ (안전성 유지)
    cur.execute("PRAGMA cache_size = -64000;")     # 64MB 캐시 (음수 = KB 단위)
    cur.execute("PRAGMA temp_store = MEMORY;")     # 임시 테이블 메모리 사용
    cur.execute("PRAGMA wal_autocheckpoint = 1000;")  # 체크포인트 주기
    # ==============================

    # 스키마 생성
    cur.executescript("""
        CREATE TABLE IF NOT EXISTS tiles (
            zoom_level INTEGER,
            tile_column INTEGER,
            tile_row INTEGER,
            tile_data BLOB,
            UNIQUE (zoom_level, tile_column, tile_row)
        );
        CREATE TABLE IF NOT EXISTS metadata (
            name TEXT,
            value TEXT,
            UNIQUE (name)
        );
        CREATE INDEX IF NOT EXISTS tile_index ON tiles (zoom_level, tile_column, tile_row);
    """)

    # 메타데이터 삽입
    metadata = [
        ('name', os.path.basename(db_path).replace('.mbtiles', '')),
        ('format', 'png'),
        ('bounds', f"{WEST},{SOUTH},{EAST},{NORTH}"),
        ('minzoom', str(MIN_ZOOM)),
        ('maxzoom', str(MAX_ZOOM)),
        ('type', 'baselayer'),
        ('version', '1'),
        ('description', 'Generated with Python + WAL mode')
    ]
    cur.executemany("INSERT OR REPLACE INTO metadata (name, value) VALUES (?, ?);", metadata)

    # 트랜잭션 시작 (성능 ↑)
    cur.execute("BEGIN;")
    conn.commit()
    return conn


def flip_y(y, zoom):
    """XYZ → TMS y 좌표 변환 (MBTiles는 TMS 사용)"""
    return (1 << zoom) - 1 - y


def download_tile(z, x, y):
    url = TILE_URL.format(z=z, x=x, y=y)
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code == 200:
            return resp.content
        else:
            print(f"[{z}/{x}/{y}] HTTP {resp.status_code}")
            return None
    except Exception as e:
        print(f"[{z}/{x}/{y}] 오류: {e}")
        return None


def save_tile(conn, z, x, y, data):
    tms_y = flip_y(y, z)
    conn.execute(
        "INSERT OR REPLACE INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES (?, ?, ?, ?)",
        (z, x, tms_y, data)
    )


def main():
    if os.path.exists(MBTILES_PATH):
        print(f"기존 파일 삭제: {MBTILES_PATH}")
        os.remove(MBTILES_PATH)

    conn = create_mbtiles(MBTILES_PATH)
    cur = conn.cursor()

    total = saved = 0
    print(f"다운로드 시작: z={MIN_ZOOM}~{MAX_ZOOM}, bounds=({WEST},{SOUTH},{EAST},{NORTH})")

    try:
        for zoom in range(MIN_ZOOM, MAX_ZOOM + 1):
            tiles = list(mercantile.tiles(WEST, SOUTH, EAST, NORTH, zoom))
            print(f"\nZoom {zoom}: {len(tiles)} 타일 처리 중...")

            for tile in tiles:
                total += 1
                data = download_tile(tile.z, tile.x, tile.y)
                if data:
                    save_tile(conn, tile.z, tile.x, tile.y, data)
                    saved += 1

                # 500개마다 커밋 (WAL 모드에서도 안정성 확보)
                if total % 500 == 0:
                    cur.execute("COMMIT;")
                    cur.execute("BEGIN;")
                    print(f"  → {total}개 처리, {saved}개 저장")

        # 최종 커밋
        cur.execute("COMMIT;")
        print(f"\n성공! {saved}/{total} 타일 저장 → {MBTILES_PATH}")

    except KeyboardInterrupt:
        print("\n\n중단됨. 현재까지 저장된 타일 커밋 중...")
        cur.execute("COMMIT;")
    except Exception as e:
        print(f"\n오류 발생: {e}")
        cur.execute("COMMIT;")
    finally:
        conn.close()

    # WAL 체크포인트 강제 실행 (정리)
    print("WAL 체크포인트 실행 중...")
    cleanup_conn = sqlite3.connect(MBTILES_PATH)
    cleanup_conn.execute("PRAGMA wal_checkpoint(FULL);")
    cleanup_conn.close()
    print("완료!")


if __name__ == "__main__":
    main()
