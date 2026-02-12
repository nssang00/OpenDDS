#include <iostream>
#include <vector>
#include <string>
#include <stdexcept>
#include <windows.h>

#include "gdal_priv.h"
#include "gdal_utils.h"
#include "cpl_conv.h"
#include "cpl_vsi.h"

static std::vector<std::string> collectTifFiles(const std::string& folder)
{
    std::vector<std::string> files;
    WIN32_FIND_DATAA fd;

    HANDLE h = FindFirstFileA((folder + "\\*.tif").c_str(), &fd);
    if (h != INVALID_HANDLE_VALUE) {
        do {
            if (!(fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY))
                files.push_back(folder + "\\" + fd.cFileName);
        } while (FindNextFileA(h, &fd));
        FindClose(h);
    }

    h = FindFirstFileA((folder + "\\*.tiff").c_str(), &fd);
    if (h != INVALID_HANDLE_VALUE) {
        do {
            if (!(fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY))
                files.push_back(folder + "\\" + fd.cFileName);
        } while (FindNextFileA(h, &fd));
        FindClose(h);
    }

    std::sort(files.begin(), files.end());
    return files;
}

void convertToMBTiles(const std::string& inputFolder,
                      const std::string& outputPath)
{
    std::vector<std::string> inputFiles = collectTifFiles(inputFolder);

    if (inputFiles.empty())
        throw std::runtime_error("[입력] " + inputFolder + " 에서 tif 파일을 찾을 수 없음");

    std::cout << "tif 파일 " << inputFiles.size() << "개 발견\n";
    for (size_t i = 0; i < inputFiles.size(); i++)
        std::cout << "  " << inputFiles[i] << "\n";

    GDALAllRegister();
    CPLSetConfigOption("GDAL_NUM_THREADS", "ALL_CPUS");

    // ── STEP 1. BuildVRT → /vsimem/merged.vrt ────────
    std::vector<GDALDataset*> srcDS;
    srcDS.reserve(inputFiles.size());
    for (size_t i = 0; i < inputFiles.size(); i++) {
        GDALDataset* ds = (GDALDataset*)GDALOpen(inputFiles[i].c_str(), GA_ReadOnly);
        if (!ds)
            throw std::runtime_error("[BuildVRT] GDALOpen 실패: " + inputFiles[i]
                                     + " | " + CPLGetLastErrorMsg());
        srcDS.push_back(ds);
    }

    const char* vrtArgv[] = {
        "-srcnodata", "0 0 0",
        "-vrtnodata", "0",
        "-addalpha",
        nullptr
    };
    GDALBuildVRTOptions* vrtOpts = GDALBuildVRTOptionsNew(const_cast<char**>(vrtArgv), nullptr);

    int usageErr = FALSE;
    GDALDataset* vrtDS = (GDALDataset*)GDALBuildVRT(
        "/vsimem/merged.vrt",
        (int)srcDS.size(),
        (GDALDatasetH*)srcDS.data(),
        nullptr,
        vrtOpts,
        &usageErr
    );
    GDALBuildVRTOptionsFree(vrtOpts);
    for (size_t i = 0; i < srcDS.size(); i++) GDALClose(srcDS[i]);

    if (!vrtDS)
        throw std::runtime_error("[BuildVRT] 실패: " + std::string(CPLGetLastErrorMsg()));

    // ── STEP 2. GDALTranslate → MBTiles ──────────────
    const char* transArgv[] = {
        "-of", "MBTILES",
        "-co", "TILE_FORMAT=PNG",
        nullptr
    };
    GDALTranslateOptions* transOpts = GDALTranslateOptionsNew(const_cast<char**>(transArgv), nullptr);

    GDALDataset* mbDS = (GDALDataset*)GDALTranslate(
        outputPath.c_str(),
        (GDALDatasetH)vrtDS,
        transOpts,
        &usageErr
    );
    GDALTranslateOptionsFree(transOpts);
    GDALClose(vrtDS);
    VSIUnlink("/vsimem/merged.vrt");

    if (!mbDS)
        throw std::runtime_error("[GDALTranslate] 실패: " + std::string(CPLGetLastErrorMsg()));

    // ── STEP 3. BuildOverviews ────────────────────────
    int levels[] = {2, 4, 8, 16, 32, 64, 128};

    CPLErr err = mbDS->BuildOverviews(
        "BILINEAR",
        sizeof(levels) / sizeof(int),
        levels,
        0,
        nullptr,
        GDALDummyProgress,
        nullptr
    );
    GDALClose(mbDS);

    if (err != CE_None)
        throw std::runtime_error("[BuildOverviews] 실패: " + std::string(CPLGetLastErrorMsg()));
}

int main(int argc, char* argv[])
{
    if (argc != 3) {
        std::cerr << "사용법: " << argv[0] << " <입력폴더> <출력.mbtiles>\n";
        std::cerr << "예시:   " << argv[0] << " C:\\data\\tiles output.mbtiles\n";
        return 1;
    }

    try {
        convertToMBTiles(argv[1], argv[2]);
        std::cout << "완료: " << argv[2] << "\n";
    }
    catch (const std::exception& e) {
        std::cerr << "오류: " << e.what() << "\n";
        VSIUnlink("/vsimem/merged.vrt");
        return 1;
    }

    return 0;
}
