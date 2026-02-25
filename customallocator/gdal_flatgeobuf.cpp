#include <gdal_priv.h>
#include <ogrsf_frmts.h>
#include <ogr_geometry.h>
#include <iostream>
#include <vector>
#include <string>

struct FeatureInfo {
    long fid;
    std::string hazard_code;
    std::string name;  // 또는 다른 속성
    std::string geom_wkt;
    double distance_m; // 중심\~가장 가까운 점 거리 (옵션)
};

std::vector<FeatureInfo> queryFeatures(
    const std::string& fgbPath,
    double centerX, double centerY,  // 경도, 위도 (EPSG:4326)
    double radiusMeters,
    const std::string& attrFilterExpr = "")  // 예: "hazard_code = 'HazardA_PBD130' AND risk <= 5"
{
    GDALAllRegister();

    auto* ds = GDALDataset::Open(fgbPath.c_str(), GDAL_OF_VECTOR | GDAL_OF_READONLY);
    if (!ds) throw std::runtime_error("Cannot open FlatGeobuf");

    auto* layer = ds->GetLayer(0);
    if (!layer) throw std::runtime_error("No layer");

    // 중심점 (4326)
    OGRPoint center(centerX, centerY);
    center.assignSpatialReference(OGRSpatialReference::EPSG(4326));

    // 한국 근처 → EPSG:5179 (미터 단위)로 변환
    OGRSpatialReference srcSRS("EPSG:4326"), tgtSRS("EPSG:5179");
    auto* ct = OGRCreateCoordinateTransformation(&srcSRS, &tgtSRS);
    if (!ct) throw std::runtime_error("Coord transform failed");

    double tx = centerX, ty = centerY;
    ct->Transform(1, &tx, &ty);
    OGRPoint centerProj(tx, ty);
    centerProj.assignSpatialReference(&tgtSRS);

    // 원형 버퍼 생성 (30 segments ≈ 원에 가까움)
    OGRGeometry* buffer = centerProj.Buffer(radiusMeters, 30);
    if (!buffer) throw std::runtime_error("Buffer failed");

    // bbox 추출 → 공간 인덱스 활용 (FlatGeobuf가 있으면 GDAL 자동으로 range request 최적화)
    OGREnvelope env;
    buffer->getEnvelope(&env);

    // 속성 필터 적용 (SQL WHERE 절처럼)
    if (!attrFilterExpr.empty()) {
        layer->SetAttributeFilter(attrFilterExpr.c_str());
    }

    // 공간 필터 (bbox 먼저 → FlatGeobuf 인덱스 활용)
    layer->SetSpatialFilterRect(env.MinX, env.MinY, env.MaxX, env.MaxY);

    std::vector<FeatureInfo> results;

    layer->ResetReading();
    while (auto* feat = layer->GetNextFeature()) {
        auto* geom = feat->GetGeometryRef();
        if (!geom) {
            OGRFeature::DestroyFeature(feat);
            continue;
        }

        // projected로 변환해서 정확한 intersects 체크
        auto* geomProj = geom->clone();
        geomProj->transform(ct);

        if (geomProj->Intersects(buffer)) {
            FeatureInfo info;
            info.fid = feat->GetFID();
            info.hazard_code = feat->GetFieldAsString("hazard_code") ? feat->GetFieldAsString("hazard_code") : "";
            info.name = feat->GetFieldAsString("이름") ? feat->GetFieldAsString("이름") : "";

            char* wkt = nullptr;
            geom->exportToWkt(&wkt);
            info.geom_wkt = wkt ? wkt : "";
            CPLFree(wkt);

            // 거리 (옵션)
            info.distance_m = geomProj->Distance(&centerProj);

            results.push_back(std::move(info));
        }

        delete geomProj;
        OGRFeature::DestroyFeature(feat);
    }

    delete buffer;
    OCTDestroyCoordinateTransformation(ct);
    GDALClose(ds);

    return results;
}

/*
auto results = queryFeatures(
    "risk_areas.fgb",
    126.978, 37.566,     // 서울 시청
    500.0,               // 500m
    "hazard_code = 'HazardA_PBD130' AND risk_level <= 5"
);

for (const auto& f : results) {
    std::cout << "FID: " << f.fid << ", code: " << f.hazard_code
              << ", name: " << f.name << ", dist: " << f.distance_m
              << "\n  WKT: " << f.geom_wkt.substr(0, 100) << "...\n";
}
*/
