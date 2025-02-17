parseLayerNode(node) {
    const nodeObj = { type: node.tagName };
    for (const attr of node.attributes) {
        nodeObj[attr.name] = attr.value;
    }

    let children = [];
    for (let child of node.children) {
        // 자식이 또 다른 태그를 가지고 있다면 재귀적으로 호출
        if (child.children.length > 0) {
            children.push(this.parseLayerNode(child));
        } else {
            const childObj = { type: child.tagName };
            for (const attr of child.attributes) {
                childObj[attr.name] = attr.value;
            }
            children.push(childObj);
        }
    }

    // 'Layer'와 'Feature'에서만 'features'와 'layers' 배열을 사용
    if (children.length > 0) {
        if (node.tagName === 'Layer') {
            nodeObj.features = children;  // 'Layer'는 'features' 배열에 자식 추가
        } else if (node.tagName === 'Feature') {
            nodeObj.children = children;  // 'Feature'는 'children' 배열에 자식 추가
        } else if (node.tagName === 'Group') {
            nodeObj.layers = children;  // 'Group'은 'layers' 배열에 자식 추가
        } else {
            // 'Layer', 'Feature', 'Group' 이외의 태그는 그냥 자식으로 추가
            nodeObj.children = children;
        }
    }

    return nodeObj;
}
//////

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
