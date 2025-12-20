방법 1의 완전한 코드입니다:

```cpp
#include "gdal_priv.h"
#include "gdal_utils.h"
#include "ogr_spatialref.h"
#include <vector>
#include <string>
#include <algorithm>
#include <cmath>

class ViewshedProcessor {
private:
    GDALDataset *m_poVRT;
    double m_adfGeoTransform[6];
    
public:
    ViewshedProcessor() : m_poVRT(nullptr) {
        GDALAllRegister();
    }
    
    ~ViewshedProcessor() {
        if (m_poVRT) {
            GDALClose(m_poVRT);
        }
    }
    
    // VRT 초기화 (프로그램 시작 시 한 번만)
    bool Initialize(const std::vector<std::string> &tifFiles) {
        if (tifFiles.empty()) {
            CPLError(CE_Failure, CPLE_AppDefined, "No input files provided");
            return false;
        }
        
        // 파일 목록을 char** 형식으로 변환
        std::vector<const char*> fileList;
        for (const auto &file : tifFiles) {
            fileList.push_back(file.c_str());
        }
        
        // VRT 옵션 설정
        GDALBuildVRTOptions *pOptions = GDALBuildVRTOptionsNew(nullptr, nullptr);
        
        // VRT 생성 (메모리에)
        m_poVRT = (GDALDataset*)GDALBuildVRT(
            "",  // 메모리에 생성
            fileList.size(),
            nullptr,
            const_cast<char**>(fileList.data()),
            pOptions,
            nullptr
        );
        
        GDALBuildVRTOptionsFree(pOptions);
        
        if (!m_poVRT) {
            CPLError(CE_Failure, CPLE_AppDefined, "Failed to create VRT");
            return false;
        }
        
        // GeoTransform 저장
        if (m_poVRT->GetGeoTransform(m_adfGeoTransform) != CE_None) {
            CPLError(CE_Failure, CPLE_AppDefined, "Failed to get GeoTransform");
            return false;
        }
        
        CPLDebug("ViewshedProcessor", "VRT initialized with %d files", (int)tifFiles.size());
        CPLDebug("ViewshedProcessor", "VRT size: %d x %d", 
                 m_poVRT->GetRasterXSize(), m_poVRT->GetRasterYSize());
        
        return true;
    }
    
    // 좌표를 픽셀 인덱스로 변환
    void WorldToPixel(double worldX, double worldY, int &pixelX, int &pixelY) {
        // GeoTransform: [originX, pixelWidth, 0, originY, 0, -pixelHeight]
        pixelX = (int)((worldX - m_adfGeoTransform[0]) / m_adfGeoTransform[1]);
        pixelY = (int)((worldY - m_adfGeoTransform[3]) / m_adfGeoTransform[5]);
    }
    
    // 픽셀 인덱스를 좌표로 변환
    void PixelToWorld(int pixelX, int pixelY, double &worldX, double &worldY) {
        worldX = m_adfGeoTransform[0] + pixelX * m_adfGeoTransform[1];
        worldY = m_adfGeoTransform[3] + pixelY * m_adfGeoTransform[5];
    }
    
    // Viewshed 수행 (사용자가 지도 클릭할 때마다 호출)
    GDALDataset* PerformViewshed(
        double clickX,              // 클릭한 X 좌표 (투영 좌표계)
        double clickY,              // 클릭한 Y 좌표 (투영 좌표계)
        double radius = 10000.0,    // 반경 (미터)
        double observerHeight = 1.75, // 관찰자 높이 (미터)
        double targetHeight = 0.0,   // 타겟 높이 (미터)
        const char *outputPath = nullptr  // nullptr이면 메모리만
    ) {
        if (!m_poVRT) {
            CPLError(CE_Failure, CPLE_AppDefined, "VRT not initialized");
            return nullptr;
        }
        
        // 1. 추출할 영역 계산 (10km 반경 + 5km 버퍼)
        double buffer = 5000.0;  // viewshed는 영역 밖도 참조
        double xmin = clickX - radius - buffer;
        double xmax = clickX + radius + buffer;
        double ymin = clickY - radius - buffer;
        double ymax = clickY + radius + buffer;
        
        CPLDebug("ViewshedProcessor", 
                 "Processing viewshed at (%.2f, %.2f) with radius %.0fm", 
                 clickX, clickY, radius);
        
        // 2. 좌표를 픽셀 인덱스로 변환
        int xOff, yOff, xEnd, yEnd;
        WorldToPixel(xmin, ymax, xOff, yOff);  // 좌상단
        WorldToPixel(xmax, ymin, xEnd, yEnd);  // 우하단
        
        int xSize = xEnd - xOff;
        int ySize = yEnd - yOff;
        
        // 3. 경계 체크 및 보정
        int vrtWidth = m_poVRT->GetRasterXSize();
        int vrtHeight = m_poVRT->GetRasterYSize();
        
        xOff = std::max(0, xOff);
        yOff = std::max(0, yOff);
        xSize = std::min(xSize, vrtWidth - xOff);
        ySize = std::min(ySize, vrtHeight - yOff);
        
        if (xSize <= 0 || ySize <= 0) {
            CPLError(CE_Failure, CPLE_AppDefined, 
                     "Invalid subset size: %d x %d", xSize, ySize);
            return nullptr;
        }
        
        CPLDebug("ViewshedProcessor", 
                 "Reading subset: offset(%d, %d) size(%d x %d)", 
                 xOff, yOff, xSize, ySize);
        
        // 4. VRT에서 필요한 영역만 읽기 (핵심!)
        GDALRasterBand *poBand = m_poVRT->GetRasterBand(1);
        if (!poBand) {
            CPLError(CE_Failure, CPLE_AppDefined, "Failed to get raster band");
            return nullptr;
        }
        
        // NoData 값 확인
        int hasNoData;
        double noDataValue = poBand->GetNoDataValue(&hasNoData);
        
        // 메모리 할당
        float *pafData = (float*)CPLMalloc(sizeof(float) * xSize * ySize);
        if (!pafData) {
            CPLError(CE_Failure, CPLE_OutOfMemory, 
                     "Failed to allocate memory for %d x %d pixels", xSize, ySize);
            return nullptr;
        }
        
        // RasterIO로 데이터 읽기
        CPLErr err = poBand->RasterIO(
            GF_Read,
            xOff, yOff,           // 시작 위치
            xSize, ySize,         // 읽을 크기
            pafData,              // 출력 버퍼
            xSize, ySize,         // 버퍼 크기
            GDT_Float32,          // 데이터 타입
            0, 0                  // 픽셀/라인 간격 (0 = 기본값)
        );
        
        if (err != CE_None) {
            CPLError(CE_Failure, CPLE_AppDefined, "RasterIO failed");
            CPLFree(pafData);
            return nullptr;
        }
        
        // 5. 메모리 데이터셋 생성
        GDALDriver *poMemDriver = GetGDALDriverManager()->GetDriverByName("MEM");
        if (!poMemDriver) {
            CPLError(CE_Failure, CPLE_AppDefined, "MEM driver not available");
            CPLFree(pafData);
            return nullptr;
        }
        
        GDALDataset *poMemDS = poMemDriver->Create(
            "", xSize, ySize, 1, GDT_Float32, nullptr
        );
        
        if (!poMemDS) {
            CPLError(CE_Failure, CPLE_AppDefined, "Failed to create MEM dataset");
            CPLFree(pafData);
            return nullptr;
        }
        
        // 6. GeoTransform 설정 (서브셋의 좌표 정보)
        double subsetGT[6];
        PixelToWorld(xOff, yOff, subsetGT[0], subsetGT[3]);  // 좌상단 좌표
        subsetGT[1] = m_adfGeoTransform[1];  // 픽셀 너비
        subsetGT[2] = 0;
        subsetGT[4] = 0;
        subsetGT[5] = m_adfGeoTransform[5];  // 픽셀 높이 (음수)
        
        poMemDS->SetGeoTransform(subsetGT);
        poMemDS->SetProjection(m_poVRT->GetProjectionRef());
        
        // 7. 데이터 쓰기
        GDALRasterBand *poMemBand = poMemDS->GetRasterBand(1);
        if (hasNoData) {
            poMemBand->SetNoDataValue(noDataValue);
        }
        
        err = poMemBand->RasterIO(
            GF_Write,
            0, 0,                 // 메모리 데이터셋의 시작 위치
            xSize, ySize,
            pafData,
            xSize, ySize,
            GDT_Float32,
            0, 0
        );
        
        CPLFree(pafData);
        
        if (err != CE_None) {
            CPLError(CE_Failure, CPLE_AppDefined, "Failed to write to MEM dataset");
            GDALClose(poMemDS);
            return nullptr;
        }
        
        // 8. Viewshed 실행
        CPLDebug("ViewshedProcessor", "Running viewshed algorithm...");
        
        GDALViewshedOutputType outputMode = GVOT_NORMAL;
        
        GDALDataset *poViewshedDS = (GDALDataset*)GDALViewshedGenerate(
            (GDALRasterBandH)poMemBand,
            nullptr,              // 드라이버 (nullptr = MEM)
            nullptr,              // 출력 파일명
            nullptr,              // 생성 옵션
            clickX, clickY,       // 관찰점 좌표
            observerHeight,       // 관찰자 높이
            targetHeight,         // 타겟 높이
            radius,               // 최대 거리
            hasNoData ? noDataValue : 0.0,  // NoData 값
            0.0,                  // DEM 곡률 계수
            outputMode,           // 출력 모드
            nullptr,              // 진행 콜백
            nullptr,              // 진행 데이터
            nullptr               // 높이 모드
        );
        
        GDALClose(poMemDS);
        
        if (!poViewshedDS) {
            CPLError(CE_Failure, CPLE_AppDefined, "Viewshed generation failed");
            return nullptr;
        }
        
        CPLDebug("ViewshedProcessor", "Viewshed completed successfully");
        
        //
