import xml.etree.ElementTree as ET
from collections import defaultdict
import io

# ========== 1. style.xml 파싱 및 중복 그룹화 ==========

def flatten_style(elem):
    tag_map = defaultdict(list)
    for child in elem:
        tag = child.tag.strip()
        if list(child):
            tag_map[tag].append(flatten_style(child))
        else:
            tag_map[tag].append(child.text.strip() if child.text else "")
    # (태그, 값) 쌍을 태그 이름순으로 튜플화(정렬)
    return tuple(sorted((tag, tuple(vals) if len(vals)>1 else vals[0]) for tag, vals in tag_map.items()))

def parse_styles(style_xml_path):
    tree = ET.parse(style_xml_path, parser=ET.XMLParser(encoding="utf-8"))
    root = tree.getroot()

    style_name_to_key = {}
    style_key_to_names = defaultdict(list)

    for style_elem in root.findall('Style'):
        style_name = style_elem.get('name')
        style_type = style_elem.get('type')
        visual_props = flatten_style(style_elem)
        key = (style_type, visual_props)
        style_name_to_key[style_name] = key
        style_key_to_names[key].append(style_name)
    return style_name_to_key, style_key_to_names

# ========== 2. layer.xml 파싱 (Feature별 style name 추출) ==========

def extract_style_names_from_layer(root):
    style_names = set()
    for layer in root.iter('Layer'):
        for feat in layer.findall('Feature'):
            if 'GeometryStyle' in feat.attrib:
                style_names.add(feat.get('GeometryStyle'))
            if 'LabelStyle' in feat.attrib:
                style_names.add(feat.get('LabelStyle'))
    # Group은 재귀적으로 처리
    for group in root.iter('Group'):
        style_names |= extract_style_names_from_layer(group)
    return style_names

def count_features(root):
    # Feature 개수 세기 (레이어+그룹 모두)
    return sum(1 for _ in root.iter('Feature'))

# ========== 3. main 분석 및 출력 ==========

def main(style_xml_path, layer_xml_path):
    # 1. style.xml
    style_name_to_key, style_key_to_names = parse_styles(style_xml_path)
    print(f"[style.xml] 전체 style 개수: {len(style_name_to_key)}")
    print(f"[style.xml] 내용이 unique한 style 개수: {len(style_key_to_names)}")

    print("[style.xml] 중복 style 그룹(내용이 동일한 스타일 여러 개):")
    found = False
    for names in style_key_to_names.values():
        if len(names) > 1:
            print("  " + ", ".join(names))
            found = True
    if not found:
        print("  (중복 없음)")

    # 2. layer.xml
    tree = ET.parse(layer_xml_path, parser=ET.XMLParser(encoding="utf-8"))
    root = tree.getroot()
    used_style_names = extract_style_names_from_layer(root)
    feature_count = count_features(root)

    print(f"\n[layer.xml] Feature 개수: {feature_count}")
    print(f"[layer.xml] 참조되는 style name 개수: {len(used_style_names)}")
    print(f"[layer.xml] 참조되는 style name 목록: {sorted(used_style_names)}")

    # 3. layer에서 실제 사용하는 unique style(내용 기준)
    used_keys = set()
    missing = []
    for name in used_style_names:
        key = style_name_to_key.get(name)
        if key is None:
            missing.append(name)
        else:
            used_keys.add(key)
    print(f"\n[layer에서 실제 사용하는 unique style(내용 기준) 개수: {len(used_keys)}")
    if missing:
        print("[경고] layer.xml에서 참조하나 style.xml에 없는 style name:", missing)

    # 4. layer에서 "서로 다른 이름이지만 내용이 같은 스타일"이 실제 쓰이는지
    group_map = defaultdict(list)
    for name in used_style_names:
        key = style_name_to_key.get(name)
        if key is not None:
            group_map[key].append(name)
    found = False
    print("\n[layer에서 참조한 style 중 내용이 동일한 서로 다른 style name 그룹]:")
    for names in group_map.values():
        if len(names) > 1:
            print("  " + ", ".join(names))
            found = True
    if not found:
        print("  (layer.xml에서 참조된 스타일 중 내용이 완전히 같은 이름은 없음)")

if __name__ == "__main__":
    # 파일 경로를 아래처럼 지정하세요
    style_xml_path = "STYLE.xml"
    layer_xml_path = "layer.xml"
    main(style_xml_path, layer_xml_path)
