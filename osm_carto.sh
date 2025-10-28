#!/bin/bash

# 변수 설정
DB_NAME="gis"
DB_USER="postgres"
PBF_FILE="south-korea-latest.osm.pbf"
PBF_URL="https://download.geofabrik.de/asia/south-korea-latest.osm.pbf"

# 데이터 다운로드
wget -O $PBF_FILE $PBF_URL

# OpenStreetMap Carto 클론
git clone https://github.com/gravitystorm/openstreetmap-carto.git
cd openstreetmap-carto

# 데이터 임포트 (인덱스 없이)
osm2pgsql -d $DB_NAME -U $DB_USER --create --slim -G --hstore \
  --tag-transform-script openstreetmap-carto.lua \
  -C 2500 --number-processes 4 \
  --hstore-match-only \
  ../$PBF_FILE

# 인덱스 생성 (데이터 임포트 후 한 번만)
psql -d $DB_NAME -f indexes.sql

# 스타일 파일 생성
carto project.mml > mapnik.xml

echo "모든 과정 완료!"
