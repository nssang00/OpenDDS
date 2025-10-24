import mapnik, math

XML = "/absolute/path/to/mapnik.xml"  # 수정

m = mapnik.Map(1024, 1024)
mapnik.load_map(m, XML)

# --- Styles: stylerange 대응 ---
style_names = [name for name in m.styles]        # 이터레이션으로 이름 수집
style_count = sum(1 for _ in m.styles)           # 수동 count (len() 대신)
print("🎨 styles:", style_count)
print("first styles:", style_names[:10])

# rules 개수도 보고 싶다면:
for name in style_names[:10]:
    st = m.find_style(name)
    try:
        print(f" - {name}: {len(st.rules)} rules")
    except TypeError:
        # 혹시 len이 안 되면 수동 count
        rule_count = sum(1 for _ in st.rules)
        print(f" - {name}: {rule_count} rules")

# --- Layers ---
print("\n🗺️ layers:", len(m.layers))
for ly in m.layers[:15]:
    ds = ly.datasource
    print(f" - {ly.name}  type={ds.type()}")
    try:
        params = dict(ds.parameters())
        subset = {k: v for k, v in params.items() if k in ("table","file","dbname","user","type")}
        print("    ", subset)
    except Exception as e:
        print("    (datasource params error)", e)

# --- 서울 전역 BBOX로 렌더 (EPSG:3857) ---
R=6378137.0
def to_merc(lon,lat):
    return (R*math.radians(lon), R*math.log(math.tan(math.pi/4+math.radians(lat)/2)))
minx,miny = to_merc(126.76,37.41)
maxx,maxy = to_merc(127.18,37.70)
m.zoom_to_box(mapnik.Box2d(minx,miny,maxx,maxy))
m.background = mapnik.Color("lightsteelblue")
im = mapnik.Image(m.width, m.height)
mapnik.render(m, im)
im.save("seoul_debug.png","png")
print("✅ wrote seoul_debug.png")
