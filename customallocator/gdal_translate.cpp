#include <iostream>
#include <vector>
#include <string>
#include <stdexcept>

#include "gdal_priv.h"
#include "gdal_utils.h"   // GDALBuildVRT, GDALWarp, GDALTranslate
#include "cpl_conv.h"
#include "cpl_string.h"
#include "ogr_spatialref.h"

// ─────────────────────────────────────────
// 유틸: GDAL 에러 체크
// ─────────────────────────────────────────
void checkGDAL(CPLErr err, const std::string& step) {
    if (err != CE_None)
        throw std::runtime_error("[" + step + "] GDAL Error: " + CPLGetLastErrorMsg());
}

void checkPtr(void* ptr, const std::string& step) {
    if (!ptr)
        throw std::runtime_error("[" + step + "] Failed: " + CPLGetLastErrorMsg());
}

// ─────────────────────────────────────────
// STEP 1. gdalbuildvrt
//   gdalbuildvrt merged.vrt tile1.tif tile2.tif tile3.tif ...
// ─────────────────────────────────────────
GDALDataset* buildVRT(const std::vector<std::string>& inputFiles,
                      const std::string& vrtPath)
{
    std::cout << "[1/4] BuildVRT: " << inputFiles.size() << " 파일 병합\n";

    // 입력 파일 오픈
    std::vector<GDALDataset*> srcDS;
    for (const auto& f : inputFiles) {
        GDALDataset* ds = (GDALDataset*)GDALOpen(f.c_str(), GA_ReadOnly);
        checkPtr(ds, "BuildVRT Open: " + f);
        srcDS.push_back(ds);
    }

    // 옵션 구성 (-resolution highest -r bilinear 등)
    // 명령어: gdalbuildvrt [-resolution {highest|lowest|average}] [-r bilinear]
    const char* vrtArgv[] = {
        "-resolution", "highest",   // 가장 높은 해상도 기준
        "-r",          "bilinear",  // 리샘플링 방식
        nullptr
    };
    GDALBuildVRTOptions* opts = GDALBuildVRTOptionsNew(
        const_cast<char**>(vrtArgv), nullptr);

    int bUsageError = FALSE;
    GDALDataset* vrtDS = (GDALDataset*)GDALBuildVRT(
        vrtPath.c_str(),
        (int)srcDS.size(),
        (GDALDatasetH*)srcDS.data(),
        nullptr,   // papszSrcDSNames (srcDS로 전달하므로 null)
        opts,
        &bUsageError
    );

    GDALBuildVRTOptionsFree(opts);
    for (auto* ds : srcDS) GDALClose(ds);

    checkPtr(vrtDS, "BuildVRT");
    return vrtDS;
}

// ─────────────────────────────────────────
// STEP 2. gdalwarp (재투영)
//   gdalwarp -s_srs EPSG:3857 -t_srs EPSG:4326
//            -r bilinear -of GTiff merged.vrt warped.tif
// ─────────────────────────────────────────
GDALDataset* warpReproject(GDALDataset* srcDS,
                           const std::string& outputPath,
                           const std::string& srcEPSG = "EPSG:3857",
                           const std::string& dstEPSG = "EPSG:4326")
{
    std::cout << "[2/4] GDALWarp: " << srcEPSG << " → " << dstEPSG << "\n";

    const char* warpArgv[] = {
        "-s_srs",  srcEPSG.c_str(),
        "-t_srs",  dstEPSG.c_str(),
        "-r",      "bilinear",       // bilinear 리샘플링
        "-of",     "GTiff",
        "-co",     "COMPRESS=LZW",   // 중간 파일 압축
        "-co",     "TILED=YES",
        "-co",     "BLOCKXSIZE=256",
        "-co",     "BLOCKYSIZE=256",
        "-multi",                    // 멀티스레드
        "-wo",     "NUM_THREADS=ALL_CPUS",
        nullptr
    };

    GDALWarpAppOptions* opts = GDALWarpAppOptionsNew(
        const_cast<char**>(warpArgv), nullptr);

    int bUsageError = FALSE;
    GDALDatasetH srcHandle = (GDALDatasetH)srcDS;

    GDALDataset* warpedDS = (GDALDataset*)GDALWarp(
        outputPath.c_str(),
        nullptr,        // hDstDS (새 파일 생성)
        1,              // nSrcCount
        &srcHandle,
        opts,
        &bUsageError
    );

    GDALWarpAppOptionsFree(opts);
    checkPtr(warpedDS, "GDALWarp");
    return warpedDS;
}

// ─────────────────────────────────────────
// STEP 3. gdal_translate → PNG 변환
//   gdal_translate -of PNG -scale -ot Byte warped.tif output.png
//   (또는 MBTiles용 타일 PNG)
// ─────────────────────────────────────────
GDALDataset* translateToPNG(GDALDataset* srcDS,
                            const std::string& outputPath)
{
    std::cout << "[3/4] GDALTranslate → PNG\n";

    const char* transArgv[] = {
        "-of",     "PNG",
        "-ot",     "Byte",     // 8bit 변환
        "-scale",              // 자동 min/max 스케일
        // "-scale", "0", "65535", "0", "255",  // 수동 스케일 지정 시
        nullptr
    };

    GDALTranslateOptions* opts = GDALTranslateOptionsNew(
        const_cast<char**>(transArgv), nullptr);

    int bUsageError = FALSE;
    GDALDataset* pngDS = (GDALDataset*)GDALTranslate(
        outputPath.c_str(),
        (GDALDatasetH)srcDS,
        opts,
        &bUsageError
    );

    GDALTranslateOptionsFree(opts);
    checkPtr(pngDS, "GDALTranslate");
    return pngDS;
}

// ─────────────────────────────────────────
// STEP 4. gdaladdo (오버뷰/피라미드 생성)
//   gdaladdo -r average output.png 2 4 8 16 32 64
// ─────────────────────────────────────────
void buildOverviews(GDALDataset* ds)
{
    std::cout << "[4/4] BuildOverviews (gdaladdo)\n";

    // 오버뷰 레벨: 2, 4, 8, 16, 32, 64
    int overviewLevels[] = {2, 4, 8, 16, 32, 64};
    int nLevels = sizeof(overviewLevels) / sizeof(int);

    CPLErr err = ds->BuildOverviews(
        "AVERAGE",      // 리샘플링 방식 (NEAREST / AVERAGE / GAUSS / CUBIC)
        nLevels,
        overviewLevels,
        0,              // 전체 밴드 (0 = all)
        nullptr,
        GDALDummyProgress,
        nullptr
    );

    checkGDAL(err, "BuildOverviews");
    std::cout << "    오버뷰 생성 완료\n";
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────
int main()
{
    // GDAL 초기화
    GDALAllRegister();
    CPLSetConfigOption("GDAL_CACHEMAX", "1024");  // 1GB 캐시

    try {
        // 입력 파일 목록
        std::vector<std::string> inputFiles = {
            "section_01.tif",
            "section_02.tif",
            "section_03.tif",
            // ... 추가 파일
        };

        // ── STEP 1: VRT 병합 ──────────────────
        GDALDataset* vrtDS = buildVRT(inputFiles, "merged.vrt");

        // ── STEP 2: 재투영 (3857 → 4326) ──────
        GDALDataset* warpedDS = warpReproject(vrtDS, "warped.tif");
        GDALClose(vrtDS);

        // ── STEP 3: PNG 변환 ──────────────────
        GDALDataset* pngDS = translateToPNG(warpedDS, "output.png");
        GDALClose(warpedDS);

        // ── STEP 4: 오버뷰 생성 ───────────────
        buildOverviews(pngDS);

        GDALClose(pngDS);

        std::cout << "\n✅ 완료: output.png + 오버뷰 생성\n";
    }
    catch (const std::exception& e) {
        std::cerr << "❌ 오류: " << e.what() << "\n";
        return 1;
    }

    return 0;
}
