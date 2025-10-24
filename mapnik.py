import mapnik, math

XML = "/absolute/path/to/mapnik.xml"  # ← mapnik.xml 절대경로로 바꿔주세요

m = mapnik.Map(1024, 1024)
mapnik.load_map(m, XML)

# styles / layers 요약
print("styles:", len(m.styles))
print("style names (first 15):", [s for s in m.styles][:15])
print("layers:", len(m.layers))
for ly in m.layers[:20]:
    ds = ly.datasource
    params = {}
    try:
        params = dict(ds.parameters())
    except: 
        pass
    print(f"- {ly.name:28s} type={ds.type()}  table={params.get('table')}  file={params.get('file')}  db={params.get('dbname')}")

# 서울 전역 BBOX로 렌더 (EPSG:3857)
R=6378137.0
def to_merc(lon,lat):
    import math
    return (R*math.radians(lon), R*math.log(math.tan(math.pi/4+math.radians(lat)/2)))
minx,miny = to_merc(126.76,37.41)
maxx,maxy = to_merc(127.18,37.70)
m.zoom_to_box(mapnik.Box2d(minx,miny,maxx,maxy))
m.background = mapnik.Color("lightsteelblue")

im = mapnik.Image(m.width, m.height)
mapnik.render(m, im)
im.save("seoul_from_mapnik_xml.png","png")
print("✅ wrote seoul_from_mapnik_xml.png")
