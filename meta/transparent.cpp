#include <windows.h>
#include <d2d1.h>
#include <dwrite.h>
#pragma comment(lib, "d2d1.lib")
#pragma comment(lib, "dwrite.lib")

void CreateEMFWithD2D1() {
    // 1. EMF DC 생성
    HDC hEmfDC = CreateEnhMetaFile(NULL, L"output.emf", NULL, NULL);

    // 2. GDI 빨간색 원 그리기
    HPEN hRedPen = CreatePen(PS_SOLID, 3, RGB(255, 0, 0));
    SelectObject(hEmfDC, hRedPen);
    Ellipse(hEmfDC, 50, 50, 150, 150);
    DeleteObject(hRedPen);

    // 3. 메모리 DC 생성
    HDC hMemDC = CreateCompatibleDC(hEmfDC);
    HBITMAP hBitmap = CreateCompatibleBitmap(hEmfDC, 400, 300);
    SelectObject(hMemDC, hBitmap);

    // 4. 배경을 특정 색상(예: Magenta)으로 초기화
    HBRUSH hBrush = CreateSolidBrush(RGB(255, 0, 255));
    RECT rect = { 0, 0, 400, 300 };
    FillRect(hMemDC, &rect, hBrush);
    DeleteObject(hBrush);

    // 5. Direct2D 초기화
    ID2D1Factory* pD2DFactory = nullptr;
    D2D1CreateFactory(D2D1_FACTORY_TYPE_SINGLE_THREADED, &pD2DFactory);

    D2D1_RENDER_TARGET_PROPERTIES props = D2D1::RenderTargetProperties(
        D2D1_RENDER_TARGET_TYPE_DEFAULT,
        D2D1::PixelFormat(DXGI_FORMAT_B8G8R8A8_UNORM, D2D1_ALPHA_MODE_IGNORE)
    );

    ID2D1DCRenderTarget* pDCRT = nullptr;
    pD2DFactory->CreateDCRenderTarget(&props, &pDCRT);

    // 6. DirectWrite 초기화 및 텍스트 그리기
    IDWriteFactory* pDWriteFactory = nullptr;
    DWriteCreateFactory(DWRITE_FACTORY_TYPE_SHARED, __uuidof(IDWriteFactory), (IUnknown**)&pDWriteFactory);

    IDWriteTextFormat* pTextFormat = nullptr;
    pDWriteFactory->CreateTextFormat(
        L"Arial", NULL, DWRITE_FONT_WEIGHT_NORMAL,
        DWRITE_FONT_STYLE_NORMAL, DWRITE_FONT_STRETCH_NORMAL,
        24.0f, L"en-us", &pTextFormat
    );

    pDCRT->BindDC(hMemDC, &rect);
    pDCRT->BeginDraw();

    ID2D1SolidColorBrush* pBrush = nullptr;
    pDCRT->CreateSolidColorBrush(D2D1::ColorF(1, 1, 1, 1.0f), &pBrush);
    pDCRT->DrawText(
        L"Transparent Text", wcslen(L"Transparent Text"),
        pTextFormat, D2D1::RectF(100, 100, 400, 300),
        pBrush
    );

    pDCRT->EndDraw();
    pBrush->Release();
    pTextFormat->Release();
    pDWriteFactory->Release();
    pDCRT->Release();
    pD2DFactory->Release();

    // 7. 마스크 DC 생성 및 특정 색상 제거
    HDC hMaskDC = CreateCompatibleDC(hEmfDC);
    HBITMAP hMaskBitmap = CreateBitmap(400, 300, 1, 1, NULL);
    SelectObject(hMaskDC, hMaskBitmap);

    // 특정 색상(RGB(255, 0, 255))을 마스크로 변환
    SetBkColor(hMemDC, RGB(255, 0, 255));
    BitBlt(hMaskDC, 0, 0, 400, 300, hMemDC, 0, 0, SRCCOPY);
    
    // 8. 배경을 투명하게 처리하여 EMF에 적용
    BitBlt(hEmfDC, 0, 0, 400, 300, hMaskDC, 0, 0, SRCAND);
    BitBlt(hEmfDC, 0, 0, 400, 300, hMemDC, 0, 0, SRCPAINT);

    // 9. 정리 및 EMF 저장
    DeleteDC(hMaskDC);
    DeleteObject(hMaskBitmap);
    DeleteDC(hMemDC);
    DeleteObject(hBitmap);

    HENHMETAFILE hemf = CloseEnhMetaFile(hEmfDC);
    CopyEnhMetaFile(hemf, L"output.emf");
    DeleteEnhMetaFile(hemf);
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    CoInitialize(NULL);
    CreateEMFWithD2D1();
    CoUninitialize();
    return 0;
}
