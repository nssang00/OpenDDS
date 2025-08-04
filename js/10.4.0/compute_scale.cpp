#include <iostream>
#include <windows.h> // EMR_HEADER 정의 포함 (wingdi.h)

double ComputeTransformScale(const ENHMETAHEADER& header) {
    // rclFrame은 0.01mm 단위
    int logicalWidth  = header.rclFrame.right  - header.rclFrame.left;
    int logicalHeight = header.rclFrame.bottom - header.rclFrame.top;

    // szlMillimeters는 mm 단위
    int physicalWidthMM  = header.szlMillimeters.cx;
    int physicalHeightMM = header.szlMillimeters.cy;

    // szlDevice는 픽셀 단위
    int pixelWidth  = header.szlDevice.cx;
    int pixelHeight = header.szlDevice.cy;

    if (physicalWidthMM == 0 || pixelWidth == 0)
        return 1.0; // fallback: no scaling

    // scale: logical units per pixel
    double scaleX = static_cast<double>(logicalWidth) / pixelWidth;
    double scaleY = static_cast<double>(logicalHeight) / pixelHeight;

    // (또는 mm 기준으로도 가능)
    // double logicalPerMM = static_cast<double>(logicalWidth) / physicalWidthMM;
    // double pixelPerMM   = static_cast<double>(pixelWidth) / physicalWidthMM;
    // double scale = logicalPerMM / pixelPerMM;

    std::cout << "ScaleX: " << scaleX << ", ScaleY: " << scaleY << std::endl;

    return (scaleX + scaleY) / 2.0; // 평균값 리턴 (대부분 동일함)
}

HENHMETAFILE emf = GetEnhMetaFile(L"sample.emf");

if (emf) {
    ENHMETAHEADER header = { 0 };
    header.iType = EMR_HEADER;
    header.nSize = sizeof(header);

    GetEnhMetaFileHeader(emf, sizeof(header), &header);

    double scale = ComputeTransformScale(header);
    std::cout << "Suggested SVG transform: matrix(" << scale << " 0 0 " << scale << " 0 0)" << std::endl;

    DeleteEnhMetaFile(emf);
}
