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
    return tuple(sorted((tag, tuple(vals) if len(vals) > 1 else vals[0]) for tag, vals in tag_map.items()))

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

def split_map_levels(map_string):
    # "250K,500K,1M" -> ["250K", "500K", "1M"]
    return [x.strip() for x in map_string.split(",") if x.strip()]

def collect_features_by_scale(root):
    # scale(str) -> Feature정보 list
    scale_to_features = defaultdict(list)
    for layer in root.iter('Layer'):
        map_attr = layer.get('Map', '')
        scales = split_map_levels(map_attr)
        for feat in layer.findall('Feature'):
            feat_info = {
                'Name': feat.get('Name'),
                'GeometryStyle': feat.get('GeometryStyle'),
                'LabelStyle': feat.get('LabelStyle')
            }
            for scale in scales:
                scale_to_features[scale].append(feat_info)
    # Group(재귀)
    for group in root.iter('Group'):
        group_scale_to_features = collect_features_by_scale(group)
        for scale, feats in group_scale_to_features.items():
            scale_to_features[scale].extend(feats)
    return scale_to_features

def main(style_xml_path, layer_xml_path):
    # 1. style.xml 파싱
    style_name_to_key, style_key_to_names = parse_styles(style_xml_path)

    # 2. layer.xml 파싱, 축척별 Feature 분류
    tree = ET.parse(layer_xml_path, parser=ET.XMLParser(encoding="utf-8"))
    root = tree.getroot()
    scale_to_features = collect_features_by_scale(root)
    all_scales = ["25K", "50K", "100K", "250K", "500K", "1M"]

    for scale in all_scales:
        feats = scale_to_features.get(scale, [])
        feature_count = len(feats)
        style_names = set()
        for feat in feats:
            if feat['GeometryStyle']:
                style_names.add(feat['GeometryStyle'])
            if feat['LabelStyle']:
                style_names.add(feat['LabelStyle'])
        unique_style_keys = set()
        for stylename in style_names:
            key = style_name_to_key.get(stylename)
            if key is not None:
                unique_style_keys.add(key)
        print(f"[{scale}]")
        print(f"  Feature 개수: {feature_count}")
        print(f"  참조되는 style name 개수: {len(style_names)}")
        print(f"  실제 unique style 개수(내용 기준): {len(unique_style_keys)}")
        print()

if __name__ == "__main__":
    style_xml_path = "STYLE.xml"
    layer_xml_path = "LARGE.xml"
    main(style_xml_path, layer_xml_path)
