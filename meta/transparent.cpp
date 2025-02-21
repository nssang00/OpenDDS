#include <windows.h>
#include <d2d1.h>
#include <dwrite.h>
#pragma comment(lib, "d2d1.lib")
#pragma comment(lib, "dwrite.lib")

void CreateEMFWithD2D1() {
    // 1. EMF DC 생성
    HDC hEmfDC = CreateEnhMetaFile(NULL, L"output.emf", NULL, NULL);

    // 2. GDI로 빨간색 원 그리기
    HPEN hRedPen = CreatePen(PS_SOLID, 3, RGB(255, 0, 0));
    SelectObject(hEmfDC, hRedPen);
    Ellipse(hEmfDC, 50, 50, 150, 150);
    DeleteObject(hRedPen);

    // 3. 메모리 DC 생성
    HDC hMemDC = CreateCompatibleDC(hEmfDC);
    HBITMAP hBitmap = CreateCompatibleBitmap(hEmfDC, 400, 300);
    SelectObject(hMemDC, hBitmap);

    // 4. 배경을 초록색(RGB(0, 255, 0))으로 채우기 (마스크용)
    HBRUSH hBrush = CreateSolidBrush(RGB(0, 255, 0));
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

    // 7. 마스크 DC 생성 및 초록색 배경 제거
    HDC hMaskDC = CreateCompatibleDC(hEmfDC);
    HBITMAP hMaskBitmap = CreateCompatibleBitmap(hEmfDC, 400, 300);
    SelectObject(hMaskDC, hMaskBitmap);

    // 초록색을 마스크로 변환
    SetBkColor(hMemDC, RGB(0, 255, 0));
    BitBlt(hMaskDC, 0, 0, 400, 300, hMemDC, 0, 0, SRCCOPY);

    // 마스크 확인용 디버깅 코드
    COLORREF testColor = GetPixel(hMaskDC, 150, 150);  // 중앙 픽셀 값 확인
    if (testColor == RGB(0, 255, 0)) {
        MessageBox(NULL, L"마스크 생성 실패 (배경색 감지됨)", L"디버깅", MB_OK);
    } else {
        MessageBox(NULL, L"마스크 생성 성공", L"디버깅", MB_OK);
    }

    // 8. 배경을 투명하게 처리하여 EMF에 적용
    BitBlt(hEmfDC, 0, 0, 400, 300, hMaskDC, 0, 0, SRCAND);  // 배경 제거
    BitBlt(hEmfDC, 0, 0, 400, 300, hMemDC, 0, 0, SRCPAINT); // 텍스트 유지

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
