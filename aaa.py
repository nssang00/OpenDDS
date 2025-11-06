gdaladdo -r average merged.tif 2 4 8 16 32

gdal_translate in.vrt merged.tif -co COMPRESS=NONE -co BIGTIFF=IF_SAFER
