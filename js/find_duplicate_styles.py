import xml.etree.ElementTree as ET
from collections import defaultdict

parser = ET.XMLParser(encoding="utf-8")
tree = ET.parse('style.xml', parser=parser)
root = tree.getroot()

style_map = defaultdict(list)

def flatten_style(elem):
    """재귀적으로 주요 시각 속성만 key:value dict로 만듦"""
    props = {}
    for child in elem:
        tag = child.tag.strip()
        if list(child):
            props[tag] = flatten_style(child)
        else:
            props[tag] = child.text.strip() if child.text else ""
    return props

for style_elem in root.findall('Style'):
    style_name = style_elem.get('name')
    style_type = style_elem.get('type')
    visual_props = flatten_style(style_elem)
    key = (style_type, str(visual_props))
    style_map[key].append(style_name)

# 동일한 스타일의 name만 그룹별로 정리해서 출력
print("동일한(겹치는) 스타일 그룹:")
found = False
for name_list in style_map.values():
    if len(name_list) > 1:
        print(", ".join(name_list))
        found = True
if not found:
    print("동일한 스타일 그룹 없음")
