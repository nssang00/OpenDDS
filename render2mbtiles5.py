#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, math, sqlite3, argparse, mapnik, time
import multiprocessing as mp

# ---- 상수 ----
R=6378137.0; TILE=256; META=8; FORMAT="png256"; MAXLAT=85.05112878

# ---- 좌표/타일 유틸 ----
def clamp_lat(a): return max(-MAXLAT, min(MAXLAT, a))
def lonlat_to_merc(lon, lat):
    x = R*math.radians(lon)
    y = R*math.log(math.tan(math.pi/4 + math.radians(clamp_lat(lat))/2))
    return x, y
def lonlat_to_tile(lon, lat, z):
    n=2**z; lat=clamp_lat(lat); r=math.radians(lat)
    x=int((lon+180)/360*n)
    y=int((1 - (math.log(math.tan(r)+1/math.cos(r))/math.pi))/2*n)
    return max(0,min(n-1,x)), max(0,min(n-1,y))
def tile_bounds(x,y,z):
    n=2.0**z
    lon0=x/n*360-180; lon1=(x+1)/n*360-180
    lat1=math.degrees(math.atan(math.sinh(math.pi*(1-2*(y+1)/n))))
    lat0=math.degrees(math.atan(math.sinh(math.pi*(1-2*y/n))))
    return lon0, lat1, lon1, lat0
def tile_bbox_3857(x,y,z):
    lon0,lat0,lon1,lat1=tile_bounds(x,y,z)
    minx,miny=lonlat_to_merc(lon0,lat0); maxx,maxy=lonlat_to_merc(lon1,lat1)
    return mapnik.Box2d(minx,miny,maxx,maxy)
def xyz_to_tms(y,z): return (2**z-1) - y
def parse_zoom(spec):
    zs=set()
    for p in str(spec).split(","):
        p=p.strip()
        if not p: continue
        if "-" in p:
            a,b=map(int,p.split("-",1)); zs.update(range(a,b+1))
        else: zs.add(int(p))
    return sorted(zs)
def parse_bbox(s):
    try:
        a=[float(v) for v in s.split(",")]
        if len(a)!=4: raise ValueError
        return a
    except: raise argparse.ArgumentTypeError("Invalid --bbox: minx,miny,maxx,maxy")

# ---- MBTiles ----
def init_mbtiles(path, name, scheme, minzoom, maxzoom, bounds):
    new=not os.path.exists(path)
    conn=sqlite3.connect(path); cur=conn.cursor()
    cur.executescript("PRAGMA journal_mode=MEMORY;PRAGMA synchronous=OFF;PRAGMA temp_store=MEMORY;")
    if new:
        cur.executescript("""CREATE TABLE metadata(name TEXT,value TEXT);
        CREATE TABLE tiles(zoom_level INTEGER,tile_column INTEGER,tile_row INTEGER,tile_data BLOB);
        CREATE UNIQUE INDEX tile_index ON tiles(zoom_level,tile_column,tile_row);""")
        meta={"name":name,"type":"baselayer","version":"1","description":"OSM Rendered tiles","format":"png",
              "minzoom":minzoom,"maxzoom":maxzoom,"bounds":bounds,"scheme":scheme}
        for k, v in meta.items():
            cur.execute("INSERT INTO metadata (name, value) VALUES (?, ?)", (k, v))
        conn.commit()
    return conn

# ---- 워커 ----
CTX={}
def worker_init(xml, tilesize, z, xmin, xmax, ymin, ymax, scheme):
    m=mapnik.Map(tilesize*META, tilesize*META)
    mapnik.load_map(m, xml)  # transparent unless style overrides
    CTX.update(dict(m=m, ts=tilesize, z=z, xmin=xmin, xmax=xmax, ymin=ymin, ymax=ymax, scheme=scheme))

def render_meta(task):
    mx,my=task
    m,ts,z=CTX["m"],CTX["ts"],CTX["z"]
    xmin,xmax,ymin,ymax,scheme = CTX["xmin"],CTX["xmax"],CTX["ymin"],CTX["ymax"],CTX["scheme"]
    ll=tile_bbox_3857(mx, my+META-1, z); ur=tile_bbox_3857(mx+META-1, my, z)
    bbox=mapnik.Box2d(min(ll.minx,ur.minx), min(ll.miny,ur.miny), max(ll.maxx,ur.maxx), max(ll.maxy,ur.maxy))
    m.zoom_to_box(bbox)
    im=mapnik.Image(ts*META, ts*META); mapnik.render(m, im)
    rows=[]
    for dx in range(META):
        for dy in range(META):
            tx,ty=mx+dx, my+dy
            if not (xmin<=tx<=xmax and ymin<=ty<=ymax): continue
            view=im.view(dx*ts, dy*ts, ts, ts)
            ysave = xyz_to_tms(ty,z) if scheme=="tms" else ty
            rows.append((z, tx, ysave, view.tostring(FORMAT)))
    return rows

def main():
    ap=argparse.ArgumentParser(description="Meta 8x8 png256 → MBTiles (EPSG:4326 bbox)")
    ap.add_argument("--xml", required=True); 
    ap.add_argument("--mbtiles", required=True)
    ap.add_argument("-z","--zoom", required=True); 
    ap.add_argument("--bbox", required=True)
    ap.add_argument("--scheme", choices=["tms","xyz"], default="tms")
    ap.add_argument("--tilesize", type=int, default=TILE)
    ap.add_argument("--workers", type=int, default=max(8, mp.cpu_count()-1))
    ap.add_argument("--commit_batch", type=int, default=5000)
    args=ap.parse_args()

    t0=time.time()
    total_written=0
    minx,miny,maxx,maxy=parse_bbox(args.bbox.strip()); 
    zooms=parse_zoom(args.zoom)

    with init_mbtiles(args.mbtiles, os.path.basename(args.mbtiles), args.scheme, zooms[0], zooms[-1], args.bbox) as conn:
        cur=conn.cursor()
        insert_sql="INSERT OR REPLACE INTO tiles(zoom_level,tile_column,tile_row,tile_data) VALUES (?,?,?,?)"
        for z in zooms:
            x0,y0=lonlat_to_tile(minx, maxy, z); x1,y1=lonlat_to_tile(maxx, miny, z)
            xmin,xmax=min(x0,x1),max(x0,x1); ymin,ymax=min(y0,y1),max(y0,y1)
            n=2**z
            xmin=max(0,min(xmin,n-1)); xmax=max(0,min(xmax,n-1))
            ymin=max(0,min(ymin,n-1)); ymax=max(0,min(ymax,n-1))
            if xmin>xmax or ymin>ymax: print(f"[z{z}] Skip (no tiles)"); continue

            mx0=(xmin//META)*META; my0=(ymin//META)*META
            mx1=(xmax//META)*META; my1=(ymax//META)*META
            tasks=[(mx,my) for mx in range(mx0,mx1+1,META) for my in range(my0,my1+1,META)]

            pending=0; written=0; total=(xmax-xmin+1)*(ymax-ymin+1)
            with mp.Pool(processes=args.workers, initializer=worker_init,
                         initargs=(args.xml,args.tilesize,z,xmin,xmax,ymin,ymax,args.scheme),
                         maxtasksperchild=50) as pool:
                for rows in pool.imap_unordered(render_meta, tasks, chunksize=1):
                    if not rows: continue
                    cur.executemany(insert_sql, [(z,x,y,sqlite3.Binary(b)) for (z,x,y,b) in rows])
                    pending+=len(rows); written+=len(rows)
                    if pending>=args.commit_batch:
                        conn.commit(); print(f"[z{z}] +{pending} commit ({written}/{total}, {written/total:.1%})"); pending=0
                if pending: conn.commit(); print(f"[z{z}] +{pending} commit (final)")
            total_written+=written
            print(f"[z{z}] ✅ {written}/{total}")

    dt=time.time()-t0
    print(f"✅ Done: {total_written} tiles → {os.path.basename(args.mbtiles)} ({dt:.1f}s)")

if __name__=="__main__":
    mp.freeze_support(); 
    main()
