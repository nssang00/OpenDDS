import xml.etree.ElementTree as ET
from collections import defaultdict

def flatten_style(elem):
    tag_map = defaultdict(list)
    for child in elem:
        tag = child.tag.strip()
        if list(child):
            tag_map[tag].append(flatten_style(child))
        else:
            tag_map[tag].append(child.text.strip() if child.text else "")
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

def extract_feature_style_usage(root):
    # (style name → Feature Name 목록)
    style_usage = defaultdict(list)
    # (Feature Name → style name, Geometry/Label 구분)
    feature_info = []
    for layer in root.iter('Layer'):
        for feat in layer.findall('Feature'):
            name = feat.get('Name')
            if 'GeometryStyle' in feat.attrib:
                style_usage[feat.get('GeometryStyle')].append(name)
                feature_info.append((name, feat.get('GeometryStyle'), "GeometryStyle"))
            if 'LabelStyle' in feat.attrib:
                style_usage[feat.get('LabelStyle')].append(name)
                feature_info.append((name, feat.get('LabelStyle'), "LabelStyle"))
    # Group 재귀
    for group in root.iter('Group'):
        sub_usage, sub_features = extract_feature_style_usage(group)
        for k, v in sub_usage.items():
            style_usage[k].extend(v)
        feature_info.extend(sub_features)
    return style_usage, feature_info

def main(style_xml_path, layer_xml_path):
    # 1. 스타일 파싱
    style_name_to_key, style_key_to_names = parse_styles(style_xml_path)

    # 2. 레이어 파싱 및 Feature→Style 사용정보 수집
    tree = ET.parse(layer_xml_path, parser=ET.XMLParser(encoding="utf-8"))
    root = tree.getroot()
    style_usage, feature_info = extract_feature_style_usage(root)

    # [1] 동일한 style name을 참조하는 Feature Name들
    print("\n[동일한 style name을 참조하는 Feature Name들]")
    for stylename, features in style_usage.items():
        if len(features) > 1:
            print(f"  Style '{stylename}': {', '.join(features)}")

    # [2] style 이름은 다르지만 style 속성이 완전히 같은 Feature Name 그룹
    print("\n[다른 style name이지만 style 속성이 동일한 Feature Name 그룹]")
    # style 내용 key -> style name list
    for key, name_list in style_key_to_names.items():
        if len(name_list) > 1:
            # 이 key를 참조하는 Feature 목록
            feat_by_style = []
            for stylename in name_list:
                feats = style_usage.get(stylename, [])
                if feats:
                    feat_by_style.append((stylename, feats))
            if len(feat_by_style) > 1: # 실제로 여러 style name이 사용됨
                print(f"  Style names {', '.join(name for name, _ in feat_by_style)} (동일한 style 속성)")
                for stylename, features in feat_by_style:
                    print(f"    '{stylename}' → {', '.join(features)}")
    print()

if __name__ == "__main__":
    style_xml_path = "STYLE.xml"
    layer_xml_path = "layer.xml"
    main(style_xml_path, layer_xml_path)
