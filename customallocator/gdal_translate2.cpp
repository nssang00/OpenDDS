#include <iostream>
#include <vector>
#include <string>
#include <stdexcept>
#include <algorithm>
#include <windows.h>

#include "gdal_priv.h"
#include "gdal_utils.h"
#include "cpl_conv.h"
#include "cpl_vsi.h"

static int CPL_STDCALL progressCallback(double dfComplete,
                                        const char* /*pszMessage*/,
                                        void* /*pProgressArg*/)
{
    int percent = (int)(dfComplete * 100);
    std::cout << "\r" << percent << "%" << std::flush;
    if (dfComplete >= 1.0)
        std::cout << "\n";
    return TRUE;
}

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

void convertToMBTiles(const std::string& inputFolder)
{
    const std::string outputPath = inputFolder + "\\output.mbtiles";

    std::vector<std::string> inputFiles = collectTifFiles(inputFolder);

    if (inputFiles.empty())
        throw std::runtime_error("[Input] No tif files found in: " + inputFolder);

    std::cout << "Input folder : " << inputFolder << "\n";
    std::cout << "Output file  : " << outputPath << "\n";
    std::cout << "Tif files    : " << inputFiles.size() << "\n";
    for (size_t i = 0; i < inputFiles.size(); i++)
        std::cout << "  " << inputFiles[i] << "\n";
    std::cout << "\n";

    GDALAllRegister();
    CPLSetConfigOption("GDAL_NUM_THREADS", "ALL_CPUS");

    // -- STEP 1/2. BuildVRT + GDALTranslate -> MBTiles ----
    std::cout << "[1/2] BuildVRT + Translate to MBTiles...\n";

    std::vector<GDALDataset*> srcDS;
    srcDS.reserve(inputFiles.size());
    for (size_t i = 0; i < inputFiles.size(); i++) {
        GDALDataset* ds = (GDALDataset*)GDALOpen(inputFiles[i].c_str(), GA_ReadOnly);
        if (!ds)
            throw std::runtime_error("[BuildVRT] GDALOpen failed: " + inputFiles[i]
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
        throw std::runtime_error("[BuildVRT] Failed: " + std::string(CPLGetLastErrorMsg()));

    const char* transArgv[] = {
        "-of", "MBTILES",
        "-co", "TILE_FORMAT=PNG",
        nullptr
    };
    GDALTranslateOptions* transOpts = GDALTranslateOptionsNew(const_cast<char**>(transArgv), nullptr);
    GDALTranslateOptionsSetProgress(transOpts, progressCallback, nullptr);

    GDALDataset* mbDS = (GDALDataset*)GDALTranslate(
        outputPath.c_str(),
        (GDALDatasetH)vrtDS,
        transOpts,
        &usageErr
    );
    GDALTranslateOptionsFree(transOpts);
    GDALClose(vrtDS);
    GDALClose(mbDS);
    VSIUnlink("/vsimem/merged.vrt");

    if (!mbDS)
        throw std::runtime_error("[GDALTranslate] Failed: " + std::string(CPLGetLastErrorMsg()));

    // -- STEP 2/2. BuildOverviews -------------------------
    std::cout << "[2/2] Building overviews...\n";

    GDALDataset* ovDS = (GDALDataset*)GDALOpen(outputPath.c_str(), GA_Update);
    if (!ovDS)
        throw std::runtime_error("[BuildOverviews] Failed to open file: "
                                 + std::string(CPLGetLastErrorMsg()));

    int levels[] = {2, 4, 8, 16, 32, 64, 128};

    CPLErr err = GDALBuildOverviews(
        (GDALDatasetH)ovDS,
        "BILINEAR",
        sizeof(levels) / sizeof(int),
        levels,
        0,
        nullptr,
        progressCallback,
        nullptr
    );
    GDALClose(ovDS);

    if (err != CE_None)
        throw std::runtime_error("[BuildOverviews] Failed: "
                                 + std::string(CPLGetLastErrorMsg()));
}

int main(int argc, char* argv[])
{
    std::string inputFolder;

    if (argc >= 2) {
        inputFolder = argv[1];
    } else {
        std::cout << "Enter the folder path containing tif files: ";
        std::getline(std::cin, inputFolder);
    }

    // Remove trailing slash if present
    if (!inputFolder.empty() &&
        (inputFolder.back() == '\\' || inputFolder.back() == '/'))
        inputFolder.pop_back();

    try {
        convertToMBTiles(inputFolder);
        std::cout << "\nDone.\n";
    }
    catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << "\n";
        VSIUnlink("/vsimem/merged.vrt");
        return 1;
    }

    return 0;
}
