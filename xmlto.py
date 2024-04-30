import xml.etree.ElementTree as ET

# XML 파일을 불러오기
tree = ET.parse('your_xml_file.xml')  # 'your_xml_file.xml'을 실제 파일 경로로 변경
root = tree.getroot()

# 모든 'Layer' 태그를 찾음
layers = root.findall('Layer')

# 각 Layer의 SHPSource와 Map 속성 값을 추출
for layer in layers:
    shp_source = layer.attrib.get('SHPSource')
    map_value = layer.attrib.get('Map')
    print(f'SHPSource: {shp_source}, Map: {map_value}')
