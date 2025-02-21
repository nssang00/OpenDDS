#include <windows.h>
#include <d2d1.h>
#include <dwrite.h>
#pragma comment(lib, "d2d1.lib")
#pragma comment(lib, "dwrite.lib")

void CreateEMFWithD2D1() {
    // 1. EMF DC 생성
    HDC hEmfDC = CreateEnhMetaFile(NULL, L"output.emf", NULL, NULL);

    // 2. GDI 크로마키 색상(녹색)으로 배경 채우기
    HBRUSH hBrush = CreateSolidBrush(RGB(0, 255, 0));  // 크로마키 색상
    RECT bgRect = { 0, 0, 400, 300 };
    FillRect(hEmfDC, &bgRect, hBrush);
    DeleteObject(hBrush);

    // 3. GDI 빨간색 원 그리기
    HPEN hRedPen = CreatePen(PS_SOLID, 3, RGB(255, 0, 0));
    SelectObject(hEmfDC, hRedPen);
    Ellipse(hEmfDC, 50, 50, 150, 150);
    DeleteObject(hRedPen);

    // 4. Direct2D 초기화
    ID2D1Factory* pD2DFactory = nullptr;
    D2D1CreateFactory(D2D1_FACTORY_TYPE_SINGLE_THREADED, &pD2DFactory);

    D2D1_RENDER_TARGET_PROPERTIES props = D2D1::RenderTargetProperties(
        D2D1_RENDER_TARGET_TYPE_DEFAULT,
        D2D1::PixelFormat(DXGI_FORMAT_B8G8R8A8_UNORM, D2D1_ALPHA_MODE_PREMULTIPLIED)
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

    // 6. Direct2D로 텍스트 그리기 (크로마키 배경 유지)
    RECT rect = { 100, 100, 400, 300 };
    pDCRT->BindDC(hEmfDC, &rect);
    pDCRT->BeginDraw();
    pDCRT->Clear(D2D1::ColorF(0, 1, 0, 1));  // 크로마키 배경색 (녹색)

    ID2D1SolidColorBrush* pBrush = nullptr;
    pDCRT->CreateSolidColorBrush(D2D1::ColorF(1, 1, 1, 1), &pBrush);
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

    // 7. EMF 저장
    HENHMETAFILE hemf = CloseEnhMetaFile(hEmfDC);
    CopyEnhMetaFile(hemf, L"output.emf");
    DeleteEnhMetaFile(hemf);
}

// 크로마키를 적용하여 출력하는 함수
void DrawEMFWithTransparency(HDC hdcDest, int x, int y) {
    HENHMETAFILE hemf = GetEnhMetaFile(L"output.emf");
    if (hemf) {
        HDC hdcMem = CreateCompatibleDC(hdcDest);
        HBITMAP hbm = CreateCompatibleBitmap(hdcDest, 400, 300);
        HBITMAP hbmOld = (HBITMAP)SelectObject(hdcMem, hbm);

        RECT rect = { 0, 0, 400, 300 };
        FillRect(hdcMem, &rect, (HBRUSH)GetStockObject(WHITE_BRUSH));

        PlayEnhMetaFile(hdcMem, hemf, &rect);

        // 크로마키 색상(RGB 0,255,0) 투명 처리
        TransparentBlt(hdcDest, x, y, 400, 300, hdcMem, 0, 0, 400, 300, RGB(0, 255, 0));

        SelectObject(hdcMem, hbmOld);
        DeleteObject(hbm);
        DeleteDC(hdcMem);
        DeleteEnhMetaFile(hemf);
    }
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    CoInitialize(NULL);
    CreateEMFWithD2D1();

    // 윈도우 생성
    HWND hwnd = CreateWindowEx(0, L"STATIC", L"Transparent EMF Example",
        WS_OVERLAPPEDWINDOW | WS_VISIBLE, CW_USEDEFAULT, CW_USEDEFAULT, 500, 400,
        NULL, NULL, hInstance, NULL);

    HDC hdc = GetDC(hwnd);
    DrawEMFWithTransparency(hdc, 50, 50);  // (50,50) 위치에 EMF 출력
    ReleaseDC(hwnd, hdc);

    MessageBox(NULL, L"Press OK to exit.", L"Info", MB_OK);
    CoUninitialize();
    return 0;
}
