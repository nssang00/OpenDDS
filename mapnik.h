#include <mapnik/feature.hpp>
#include <mapnik/geometry.hpp>
#include <mapnik/geom_util.hpp> // for mapnik::util::apply_visitor
#include <mapbox/feature.hpp>

// Geometry 타입 변환을 위한 visitor 정의
struct GeometryConverter : public mapnik::util::static_visitor<> {
    mapbox::feature::geometry<int16_t> result;

    void operator()(mapnik::geometry::point<double> const& pt) {
        result = mapbox::geometry::point<int16_t>(static_cast<int16_t>(pt.x), static_cast<int16_t>(pt.y));
    }

    void operator()(mapnik::geometry::line_string<double> const& line) {
        mapbox::geometry::line_string<int16_t> lineString;
        for (auto const& pt : line) {
            lineString.emplace_back(static_cast<int16_t>(pt.x), static_cast<int16_t>(pt.y));
        }
        result = lineString;
    }

    void operator()(mapnik::geometry::polygon<double> const& poly) {
        mapbox::geometry::polygon<int16_t> polygon;
        mapbox::geometry::linear_ring<int16_t> exteriorRing;
        for (auto const& pt : poly.exterior_ring) {
            exteriorRing.emplace_back(static_cast<int16_t>(pt.x), static_cast<int16_t>(pt.y));
        }
        polygon.push_back(exteriorRing);
        for (auto const& interior : poly.interior_rings) {
            mapbox::geometry::linear_ring<int16_t> interiorRing;
            for (auto const& pt : interior) {
                interiorRing.emplace_back(static_cast<int16_t>(pt.x), static_cast<int16_t>(pt.y));
            }
            polygon.push_back(interiorRing);
        }
        result = polygon;
    }

    // 다른 기하학적 타입들을 위한 처리 추가 가능...

    // 기본 처리: 아무것도 하지 않음
    template <typename T>
    void operator()(T const&) {}
};

mapbox::feature::feature_collection<int16_t> convertMapnikFeaturesetToMapboxFeatureCollection(mapnik::featureset_ptr featureset) {
    mapbox::feature::feature_collection<int16_t> featureCollection;

    while (auto feature = featureset->next()) {
        mapbox::feature::feature<int16_t> mapboxFeature;

        // ID 설정
        if (feature->id() != mapnik::feature_null) {
            mapboxFeature.id = static_cast<std::uint64_t>(feature->id());
        }

        // 속성(properties) 복사
        for (const auto& attr : *feature) {
            const auto& value = attr.second;

            if (value.is_null()) {
                mapboxFeature.properties.emplace(attr.first, mapbox::feature::null_value);
            } else if (value.is_bool()) {
                mapboxFeature.properties.emplace(attr.first, value.get_bool());
            } else if (value.is_double()) {
                mapboxFeature.properties.emplace(attr.first, value.get_double());
            } else if (value.is_int64()) {
                mapboxFeature.properties.emplace(attr.first, value.get_int64());
            } else if (value.is_string()) {
                mapboxFeature.properties.emplace(attr.first, value.get<std::string>());
            } else {
                // 다른 타입은 처리하지 않음 (확장 가능)
            }
        }

        // 기하학적 정보 처리
        GeometryConverter converter;
        mapnik::util::apply_visitor(converter, feature->get_geometry());
        mapboxFeature.geometry = std::move(converter.result);

        // featureCollection에 변환된 feature 추가
        featureCollection.emplace_back(std::move(mapboxFeature));
    }

    return featureCollection;
}
    result_type operator() (mapnik::geometry::geometry_empty, mapnik::geometry::geometry_empty) const
    {
        return true;
    }

    result_type operator() (mapnik::geometry::geometry_collection<double> const& lhs, mapnik::geometry::geometry_collection<double> const& rhs) const
    {
        std::size_t size0 = lhs.size();
        std::size_t size1 = rhs.size();
        if (size0 != size1) return false;
        for (std::size_t index = 0; index < size0 ; ++index)
        {
            if (!mapnik::util::apply_visitor(*this, lhs[index], rhs[index]))
                return false;
        }
        return true;
    }

void geojson_datasource::initialise_descriptor(mapnik::feature_ptr const& feature)
{
    for ( auto const& kv : *feature)
    {
        auto const& name = std::get<0>(kv);

        mapnik::attribute_descriptor(name, mapnik::util::apply_visitor(attr_value_converter(), std::get<1>(kv)));

    }
}
