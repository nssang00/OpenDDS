import xml.etree.ElementTree as ET
from collections import defaultdict

parser = ET.XMLParser(encoding="utf-8")
tree = ET.parse('STYLE.xml', parser=parser)
root = tree.getroot()

style_map = defaultdict(list)
style_names = []

def flatten_style(elem):
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
    style_names.append(style_name)
    visual_props = flatten_style(style_elem)
    key = (style_type, str(visual_props))
    style_map[key].append(style_name)

print(f"전체 스타일 개수: {len(style_names)}")

print("동일한(겹치는) 스타일 그룹:")
found = False
dedup_count = 0
for name_list in style_map.values():
    if len(name_list) > 1:
        print(", ".join(name_list))
        dedup_count += 1
    elif len(name_list) == 1:
        dedup_count += 1
if not found:
    print("동일한 스타일 그룹 없음")

print(f"실제(유효) 스타일 개수: {dedup_count}")
