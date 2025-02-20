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

    // 3. 메모리 DC 및 비트맵 생성 (흰색 배경)
    HDC memDC = CreateCompatibleDC(hEmfDC);
    HBITMAP hBitmap = CreateCompatibleBitmap(hEmfDC, 400, 300);
    SelectObject(memDC, hBitmap);
    
    // 흰색 배경 채우기
    RECT rect = {0, 0, 400, 300};
    FillRect(memDC, &rect, (HBRUSH)GetStockObject(WHITE_BRUSH));

    // 4. Direct2D 초기화
    ID2D1Factory* pD2DFactory = nullptr;
    D2D1CreateFactory(D2D1_FACTORY_TYPE_SINGLE_THREADED, &pD2DFactory);

    D2D1_RENDER_TARGET_PROPERTIES props = D2D1::RenderTargetProperties(
        D2D1_RENDER_TARGET_TYPE_DEFAULT,
        D2D1::PixelFormat(DXGI_FORMAT_B8G8R8A8_UNORM, D2D1_ALPHA_MODE_IGNORE)
    );

    ID2D1DCRenderTarget* pDCRT = nullptr;
    pD2DFactory->CreateDCRenderTarget(&props, &pDCRT);

    // 5. DirectWrite 초기화
    IDWriteFactory* pDWriteFactory = nullptr;
    DWriteCreateFactory(DWRITE_FACTORY_TYPE_SHARED, __uuidof(IDWriteFactory), (IUnknown**)&pDWriteFactory);

    IDWriteTextFormat* pTextFormat = nullptr;
    pDWriteFactory->CreateTextFormat(
        L"Arial", NULL, DWRITE_FONT_WEIGHT_NORMAL,
        DWRITE_FONT_STYLE_NORMAL, DWRITE_FONT_STRETCH_NORMAL,
        24.0f, L"en-us", &pTextFormat
    );

    // 6. Direct2D 검은색 텍스트 그리기
    pDCRT->BindDC(memDC, &rect);
    pDCRT->BeginDraw();
    
    ID2D1SolidColorBrush* pBrush = nullptr;
    pDCRT->CreateSolidColorBrush(D2D1::ColorF(0, 0, 0, 1.0f), &pBrush);
    pDCRT->DrawText(
        L"Transparent Text", wcslen(L"Transparent Text"),
        pTextFormat, D2D1::RectF(100, 100, 400, 300),
        pBrush
    );
    pDCRT->EndDraw();

    // 7. 마스크 DC 생성 (1비트 흑백)
    HDC maskDC = CreateCompatibleDC(hEmfDC);
    HBITMAP hMaskBmp = CreateBitmap(400, 300, 1, 1, NULL);
    SelectObject(maskDC, hMaskBmp);

    // 마스크 생성 (흰색 배경 기준)
    SetBkColor(memDC, RGB(255, 255, 255));
    BitBlt(maskDC, 0, 0, 400, 300, memDC, 0, 0, SRCCOPY);

    // 8. 마스킹 합성
    // 1단계: 배경 지우기 (SRCAND)
    BitBlt(hEmfDC, 0, 0, 400, 300, maskDC, 0, 0, SRCAND);
    
    // 2단계: 텍스트 덧그리기 (SRCPAINT)
    BitBlt(hEmfDC, 0, 0, 400, 300, memDC, 0, 0, SRCPAINT);

    // 9. 리소스 정리
    DeleteDC(maskDC);
    DeleteObject(hMaskBmp);
    DeleteDC(memDC);
    DeleteObject(hBitmap);
    pBrush->Release();
    pTextFormat->Release();
    pDWriteFactory->Release();
    pDCRT->Release();
    pD2DFactory->Release();

    // 10. EMF 저장
    HENHMETAFILE hemf = CloseEnhMetaFile(hEmfDC);
    CopyEnhMetaFile(hemf, L"output.emf");
    DeleteEnhMetaFile(hemf);
}

int WINAPI WinMain(
    HINSTANCE hInstance,
    HINSTANCE hPrevInstance,
    LPSTR lpCmdLine,
    int nCmdShow
) {
    CoInitialize(NULL);
    CreateEMFWithD2D1();
    CoUninitialize();
    return 0;
}
