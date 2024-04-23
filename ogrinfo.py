import os
from subprocess import Popen, PIPE


start_path = 'C:/Temp/지도'
target_file1 = 'gis_osm_roads_free_1.shp'
target_file2 = 'bbb.shp'
result_file = 'extent.txt'

def find_shp_and_extract_extent(start_path, shp_name):
    for root, dirs, files in os.walk(start_path):
        if shp_name in files:
            shp_path = os.path.join(root, shp_name)
            args = ['C:/Program Files/QGIS 3.18/bin/ogrinfo.exe', '-ro', '-so', '-al', shp_path]
            process = Popen(args, stdout=PIPE, stderr=PIPE)
            stdout, stderr = process.communicate()
            stdout_decoded = stdout.decode('utf-8').strip()
            extent_line = [line for line in stdout_decoded.split('\n') if 'Extent:' in line][0]
            return shp_path, extent_line
    return None, None


shp_path, extent_info = find_shp_and_extract_extent(start_path, target_file1)
if not shp_path:  
    shp_path, extent_info = find_shp_and_extract_extent(start_path, target_file2)

if shp_path:  
    with open(result_file, 'w') as f:
        f.write(f'{shp_path}: {extent_info}\n')
else:
    print('not found shp')
