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

    // 3. 메모리 DC 및 임시 버퍼 생성
    HDC memDC = CreateCompatibleDC(hEmfDC);
    HBITMAP hBitmap = CreateCompatibleBitmap(hEmfDC, 400, 300);
    SelectObject(memDC, hBitmap);
    
    // 4. EMF DC의 내용을 임시 버퍼로 복사
    BitBlt(memDC, 0, 0, 400, 300, hEmfDC, 0, 0, SRCCOPY);

    // 5. Direct2D 초기화
    ID2D1Factory* pD2DFactory = nullptr;
    D2D1CreateFactory(D2D1_FACTORY_TYPE_SINGLE_THREADED, &pD2DFactory);

    D2D1_RENDER_TARGET_PROPERTIES props = D2D1::RenderTargetProperties(
        D2D1_RENDER_TARGET_TYPE_DEFAULT,
        D2D1::PixelFormat(DXGI_FORMAT_B8G8R8A8_UNORM, D2D1_ALPHA_MODE_IGNORE)
    );

    ID2D1DCRenderTarget* pDCRT = nullptr;
    pD2DFactory->CreateDCRenderTarget(&props, &pDCRT);

    // 6. DirectWrite 초기화
    IDWriteFactory* pDWriteFactory = nullptr;
    DWriteCreateFactory(DWRITE_FACTORY_TYPE_SHARED, __uuidof(IDWriteFactory), (IUnknown**)&pDWriteFactory);

    IDWriteTextFormat* pTextFormat = nullptr;
    pDWriteFactory->CreateTextFormat(
        L"Arial", NULL, DWRITE_FONT_WEIGHT_NORMAL,
        DWRITE_FONT_STYLE_NORMAL, DWRITE_FONT_STRETCH_NORMAL,
        24.0f, L"en-us", &pTextFormat
    );

    // 7. Direct2D 텍스트 그리기 (흰색 배경)
    RECT rect = { 0, 0, 400, 300 };
    pDCRT->BindDC(memDC, &rect);
    pDCRT->BeginDraw();
    
    // 흰색 배경 채우기
    ID2D1SolidColorBrush* pWhiteBrush = nullptr;
    pDCRT->CreateSolidColorBrush(D2D1::ColorF(1.0f, 1.0f, 1.0f), &pWhiteBrush);
    pDCRT->FillRectangle(D2D1::RectF(0, 0, 400, 300), pWhiteBrush);
    
    // 검은색 텍스트 그리기
    ID2D1SolidColorBrush* pBlackBrush = nullptr;
    pDCRT->CreateSolidColorBrush(D2D1::ColorF(0, 0, 0, 1.0f), &pBlackBrush);
    pDCRT->DrawText(
        L"Transparent Text", wcslen(L"Transparent Text"),
        pTextFormat, D2D1::RectF(100, 100, 400, 300),
        pBlackBrush
    );
    pDCRT->EndDraw();

    // 8. 마스크 생성
    HDC maskDC = CreateCompatibleDC(hEmfDC);
    HBITMAP hMaskBmp = CreateBitmap(400, 300, 1, 1, NULL);
    SelectObject(maskDC, hMaskBmp);
    
    // 마스크 생성 (흰색 배경, 검은색 텍스트)
    SetBkColor(memDC, RGB(255, 255, 255));
    BitBlt(maskDC, 0, 0, 400, 300, memDC, 0, 0, SRCCOPY);

    // 9. 3단계 합성
    // 1단계: 원본 EMF 내용과 텍스트 OR 연산
    BitBlt(memDC, 0, 0, 400, 300, hEmfDC, 0, 0, SRCPAINT);
    
    // 2단계: 마스크로 배경 제거
    BitBlt(memDC, 0, 0, 400, 300, maskDC, 0, 0, SRCAND);
    
    // 3단계: 최종 결과 복사
    BitBlt(hEmfDC, 0, 0, 400, 300, memDC, 0, 0, SRCCOPY);

    // 10. 리소스 정리
    DeleteDC(maskDC);
    DeleteObject(hMaskBmp);
    DeleteDC(memDC);
    DeleteObject(hBitmap);
    pWhiteBrush->Release();
    pBlackBrush->Release();
    pTextFormat->Release();
    pDWriteFactory->Release();
    pDCRT->Release();
    pD2DFactory->Release();

    // 11. EMF 저장
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
