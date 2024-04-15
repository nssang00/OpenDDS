
    std::string layer_buffer = "";
    mapnik::vector_tile_impl::layer_builder_pbf builder("foo", 4096, layer_buffer);
    using encoding_process = mapnik::vector_tile_impl::geometry_to_feature_pbf_visitor;
    using simplifier_process = mapnik::vector_tile_impl::geometry_simplifier<encoding_process>;


    feature_ptr feature;
    while ((feature = features->next()))
    {
        mapnik::geometry::geometry<double> const& geom = feature->get_geometry();
        encoding_process encoder(*feature, builder);    
        simplifier_process simplifier(simplify_distance, encoder);
        
        transform_visitor<simplifier_process> transformer(simplifier);
        mapnik::util::apply_visitor(geom);

        feature = features->next();
    }

template <typename NextProcessor>
struct transform_visitor
{
    NextProcessor & next_;

    transform_visitor(NextProcessor & next) :
      next_(next) {}

    inline void operator() (mapnik::geometry::point<double> const& geom)
    {

        mapbox::geometry::point<std::int64_t> new_geom;
        if (!tr_.apply(geom,new_geom))
        {
            return;
        }
        return next_(new_geom);
    }

    inline void operator() (mapnik::geometry::multi_point<double> const& geom)
    {
        mapbox::geometry::multi_point<std::int64_t> new_geom;

        return next_(new_geom);
    }

    inline void operator() (mapnik::geometry::line_string<double> const& geom)
    {
        mapnik::box2d<double> geom_bbox = mapnik::geometry::envelope(geom);

        return next_(new_geom);
    }

    inline void operator() (mapnik::geometry::multi_line_string<double> const& geom)
    {
        mapbox::geometry::multi_line_string<std::int64_t> new_geom;

        return next_(new_geom);
    }

    inline void operator() (mapnik::geometry::polygon<double> const& geom)
    {
        bool exterior = true;
        mapbox::geometry::polygon<std::int64_t> new_geom;

        return next_(new_geom);
    }

    inline void operator() (mapnik::geometry::multi_polygon<double> const& geom)
    {
        mapbox::geometry::multi_polygon<std::int64_t> new_geom;

        return next_(new_geom);
    }

    inline void operator() (mapnik::geometry::geometry_collection<double> const& geom)
    {
        for (auto const& g : geom)
        {
            mapnik::util::apply_visitor((*this), g);
        }
     }

    inline void operator() (mapnik::geometry::geometry_empty const&)
    {
        return;
    }
};
