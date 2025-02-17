parseLayerNode(node) {
    const nodeObj = { type: node.tagName };
    for (const attr of node.attributes) {
        nodeObj[attr.name] = attr.value;
    }

    let children = [];
    for (let child of node.children) {
        if (child.children.length > 0) {
            children.push(this.parseLayerNode(child)); // 자식 노드 재귀적으로 처리
        } else {
            const childObj = { type: child.tagName };
            for (const attr of child.attributes) {
                childObj[attr.name] = attr.value;
            }
            children.push(childObj);
        }
    }

    // 'Layer'나 'Feature' 노드에서만 'features'나 'layers'를 추가하도록 처리
    if (children.length > 0) {
        if (node.tagName === 'Layer') {
            nodeObj.features = children; // 'Layer'에서는 'features' 배열로 처리
        } else if (node.tagName === 'Feature') {
            nodeObj.VVTStyles = children;  // 'Feature'에서는 'VVTStyles' 배열로 처리
        } else if (node.tagName === 'Group') {
            nodeObj.layers = children; // 'Group'에서는 'layers' 배열로 처리
        }
    }

    return nodeObj;
}
