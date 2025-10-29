#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from math import pi, sin, log, exp, atan
import os
from pathlib import Path
import multiprocessing as mp

try:
    import mapnik  # 현대 Mapnik 파이썬 바인딩은 보통 이 모듈명
except ImportError:
    import mapnik2 as mapnik  # 혹시 시스템에 mapnik2로 설치됐다면

DEG_TO_RAD = pi / 180.0
RAD_TO_DEG = 180.0 / pi

# CPU 코어 수 기준 기본 워커 수
NUM_THREADS = max(1, (os.cpu_count() or 4) - 0)

# 큐 종료 신호(센티널)
SENTINEL = object()


def clamp(v, lo, hi):
    return lo if v < lo else hi if v > hi else v


class GoogleProjection:
    """Spherical Mercator 기반의 타일 픽셀 <-> 경위도(4326) 변환 유틸.
    (WebMercator를 직접 쓰지 않고, generate_tiles.py 전통 구현을 따름)
    """
    def __init__(self, levels=18):
        self.Bc = []  # deg->px 스케일(경도용)
        self.Cc = []  # mercY->px 스케일
        self.zc = []  # 타일 중앙 px
        c = 256.0
        for _ in range(levels):
            e = c / 2.0
            self.Bc.append(c / 360.0)
            self.Cc.append(c / (2.0 * pi))
            self.zc.append((e, e))
            c *= 2.0

    def fromLLtoPixel(self, ll, zoom):
        # ll = (lon, lat) deg
        d = self.zc[zoom]
        x = d[0] + ll[0] * self.Bc[zoom]
        f = clamp(sin(DEG_TO_RAD * ll[1]), -0.9999, 0.9999)
        y = d[1] + 0.5 * log((1 + f) / (1 - f)) * -self.Cc[zoom]
        return (int(round(x)), int(round(y)))

    def fromPixelToLL(self, px, zoom):
        # px = (xpx, ypx)
        d = self.zc[zoom]
        lon = (px[0] - d[0]) / self.Bc[zoom]
        g = (px[1] - d[1]) / -self.Cc[zoom]
        lat = RAD_TO_DEG * (2.0 * atan(exp(g)) - 0.5 * pi)
        return (lon, lat)


def tile_bbox_mercator(prj, x, y, z):
    """XYZ 타일 좌표로부터 Mapnik 맵 SRS(대개 3857) 단위의 bbox 계산."""
    # 타일 픽셀 → 경위도
    tile_px0 = (x * 256, (y + 1) * 256)
    tile_px1 = ((x + 1) * 256, y * 256)
    gp = GoogleProjection(z + 1)
    l0 = gp.fromPixelToLL(tile_px0, z)  # (lon, lat) bottom-left
    l1 = gp.fromPixelToLL(tile_px1, z)  # (lon, lat) top-right

    # Mapnik 투영(맵의 SRS로 forward)
    c0 = prj.forward(mapnik.Coord(l0[0], l0[1]))
    c1 = prj.forward(mapnik.Coord(l1[0], l1[1]))
    return mapnik.Box2d(c0.x, c0.y, c1.x, c1.y)


class RenderWorker:
    def __init__(self, tile_dir: Path, mapfile: str, q: mp.JoinableQueue, print_lock: mp.Lock, max_zoom: int):
        self.tile_dir = Path(tile_dir)
        self.q = q
        self.mapfile = mapfile
        self.max_zoom = max_zoom
        self.print_lock = print_lock

        # 워커별 Map 인스턴스/투영 준비는 loop()에서(프로세스 fork 후 안전)
        self.m = None
        self.prj = None

    def _setup_map(self):
        self.m = mapnik.Map(256, 256)
        mapnik.load_map(self.m, self.mapfile, True)
        # 버퍼 조금 확보(라벨 클리핑 방지)
        if getattr(self.m, "buffer_size", 0) < 128:
            self.m.buffer_size = 128
        self.prj = mapnik.Projection(self.m.srs)

    def _render_one(self, tile_path: Path, x: int, y: int, z: int):
        bbox = tile_bbox_mercator(self.prj, x, y, z)
        self.m.resize(256, 256)
        self.m.zoom_to_box(bbox)
        im = mapnik.Image(256, 256)
        mapnik.render(self.m, im)
        # 포맷은 'png256'이 보통 빠름(팔레트 PNG). 환경에 따라 'png8'이 설정돼 있을 수도 있음.
        tile_path.parent.mkdir(parents=True, exist_ok=True)
        im.save(str(tile_path), 'png256')

    def loop(self):
        # 프로세스 내 초기화
        self._setup_map()
        while True:
            item = self.q.get()
            try:
                if item is SENTINEL:
                    break
                (name, tile_path, x, y, z) = item
                p = Path(tile_path)

                existed = p.exists()
                if not existed:
                    try:
                        self._render_one(p, x, y, z)
                    except Exception as e:
                        with self.print_lock:
                            print(f"[worker] render error z={z} x={x} y={y}: {e}")
                        # 실패 시 다음으로 진행(필요하면 재시도 로직 삽입)

                size = p.stat().st_size if p.exists() else 0
                empty = (size <= 128)  # 환경마다 다르므로 '103 bytes' 같은 매직넘버는 지양

                with self.print_lock:
                    print(f"{name}: z={z} x={x} y={y} "
                          f"{'exists' if existed else 'new'}"
                          f"{' EMPTY' if empty else ''}")
            finally:
                self.q.task_done()


def render_tiles(bbox, mapfile, tile_dir, minZoom=1, maxZoom=18, name="unknown", num_threads=NUM_THREADS):
    """bbox: (minLon, minLat, maxLon, maxLat) in EPSG:4326"""
    tile_dir = Path(tile_dir)
    tile_dir.mkdir(parents=True, exist_ok=True)

    queue = mp.JoinableQueue(max(32, num_threads * 4))
    print_lock = mp.Lock()

    # 워커 시작
    workers = []
    for _ in range(num_threads):
        worker = RenderWorker(tile_dir, mapfile, queue, print_lock, maxZoom)
        p = mp.Process(target=worker.loop, daemon=True)
        p.start()
        workers.append(p)

    gprj = GoogleProjection(maxZoom + 1)

    # 좌상/우하 픽셀 계산(원본 generate_tiles.py와 동일 로직)
    ll0 = (bbox[0], bbox[3])  # (minLon, maxLat) -> top-left
    ll1 = (bbox[2], bbox[1])  # (maxLon, minLat) -> bottom-right

    for z in range(minZoom, maxZoom + 1):
        px0 = gprj.fromLLtoPixel(ll0, z)
        px1 = gprj.fromLLtoPixel(ll1, z)

        x_start, x_end = int(px0[0] / 256.0), int(px1[0] / 256.0)
        y_start, y_end = int(px0[1] / 256.0), int(px1[1] / 256.0)

        # XYZ 유효범위 클램프
        def valid_xy(x, y):
            limit = 2 ** z
            return (0 <= x < limit) and (0 <= y < limit)

        for x in range(x_start, x_end + 1):
            for y in range(y_start, y_end + 1):
                if not valid_xy(x, y):
                    continue
                tile_path = tile_dir / f"{z}" / f"{x}" / f"{y}.png"
                queue.put((name, str(tile_path), x, y, z))

    # 종료 신호
    for _ in range(len(workers)):
        queue.put(SENTINEL)

    # 큐 drain & 워커 조인
    queue.join()
    for p in workers:
        p.join()


def main():
    # 환경변수/기본값 처리(Python 3)
    home = Path.home()

    mapfile = os.environ.get(
        "MAPNIK_MAP_FILE",
        str(home / "svn.openstreetmap.org/applications/rendering/mapnik/osm-local.xml")
    )
    tile_dir = os.environ.get(
        "MAPNIK_TILE_DIR",
        str(home / "osm/tiles")
    )


    # 샘플: 로컬 영역
    minZoom = 10
    maxZoom = 16
    bbox = (-2.0, 50.0, 1.0, 52.0)
    render_tiles(bbox, mapfile, tile_dir, minZoom, maxZoom, "Local", num_threads=NUM_THREADS)


if __name__ == "__main__":
    mp.freeze_support()
    main()
