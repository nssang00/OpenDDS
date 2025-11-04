#!/bin/bash
# tif_to_mbtiles_final.sh
# 입력: 현재 폴더의 *.tif
# 출력: output.mbtiles

set -e

echo "1. VRT 생성 중..."
gdalbuildvrt mosaic.vrt *.tif

echo "2. PNG 압축 GeoTIFF 생성 중 (무손실 실체화)..."
gdal_translate mosaic.vrt mosaic_png.tif \
  -of GTiff \
  -co COMPRESS=PNG \
  -co TILED=YES \
  -co BIGTIFF=YES \
  -co PHOTOMETRIC=MINISBLACK

echo "3. PNG 타일 생성 중 (자동 3857 + nearest 리샘플링)..."
gdal2tiles.py \
  -z 0-18 \
  --xyz \
  --processes=$(nproc) \
  --resampling near \     # 픽셀 1:1 유지
  -w none \
  mosaic_png.tif tiles/

echo "4. MBTiles 생성 중..."
gdal_translate tiles/ output.mbtiles \
  -of MBTiles \
  -co NAME="Merged Map" \
  -co DESCRIPTION="From multiple TIFF sections" \
  -co FORMAT=PNG \
  -co ZOOM_LEVEL_STRATEGY=LOWER

echo "완료! → output.mbtiles"
echo "   QGIS / Mapbox / Leaflet에서 바로 사용 가능"
