// 개선된 노멀 계산 (면적 가중 없이 외적 누적)
std::vector<CRSVertex> normalsPerVertex(vertexCount, CRSVertex(0,0,0));
for (size_t i = 0; i < triangleCount; ++i) {
    int idx0 = mMesh.indices[i*3];
    int idx1 = mMesh.indices[i*3+1];
    int idx2 = mMesh.indices[i*3+2];
    const CRSVertex& v0 = cartesianVertices[idx0];
    const CRSVertex& v1 = cartesianVertices[idx1];
    const CRSVertex& v2 = cartesianVertices[idx2];
    CRSVertex normal = (v1 - v0).cross(v2 - v0);
    normalsPerVertex[idx0] += normal;
    normalsPerVertex[idx1] += normal;
    normalsPerVertex[idx2] += normal;
}
// 이후 각 정점 노멀 정규화
