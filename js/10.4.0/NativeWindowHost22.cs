// draw.cpp  (빌드:  /LD … user32.lib gdi32.lib)
#include <windows.h>

// 단순 데모 : 흰 배경 → 빨간 사각형 + 텍스트
extern "C" __declspec(dllexport)
void DrawDemo(HWND hwnd)
{
    if (!::IsWindow(hwnd)) return;

    HDC hdc = ::GetDC(hwnd);
    if (!hdc) return;

    RECT rc; ::GetClientRect(hwnd, &rc);
    ::FillRect(hdc, &rc, (HBRUSH)(COLOR_WINDOW + 1));

    HPEN pen = ::CreatePen(PS_SOLID, 3, RGB(200, 40, 40));
    HGDIOBJ old = ::SelectObject(hdc, pen);
    ::Rectangle(hdc, 20, 20, 180, 100);
    ::SelectObject(hdc, old);  ::DeleteObject(pen);

    ::TextOutW(hdc, 30, 50, L"C++ GDI", 7);

    ::ReleaseDC(hwnd, hdc);
}
//////
// NativeViewHost는 WPF HwndHost 파생 클래스 (Handle 보유)
var hwnd = nativeViewHost.Handle;          // System.IntPtr
SmartGI.Native.DrawDemo(hwnd);             // SWIG가 만든 P/Invoke 호출

/////////
<Window x:Class="SmartGISharp.Demo.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:sgis="clr-namespace:SmartGISharp.Wpf"
        Title="NativeWindowHost Demo" Width="1280" Height="720">

    <Grid>
        <sgis:NativeWindowHost x:Name="BrowserView"
                               Url="https://openstreetmap.org" />
    </Grid>
</Window>

using System.Windows;

namespace SmartGISharp.Demo
{
    public partial class MainWindow : Window
    {
        private Map2D? _map;   // CEF 래퍼 예시

        public MainWindow()
        {
            InitializeComponent();
            Loaded += OnLoaded;
        }

        private void OnLoaded(object sender, RoutedEventArgs e)
        {
            _map = new Map2D(BrowserView.WindowHandle, BrowserView.Url);
        }
    }
}


//////
<Window x:Class="SmartGisApp.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:smartgis="clr-namespace:SmartGIS.CSharp.Wpf;assembly=SmartGIS.CSharp"
        Title="MainWindow"
        Height="450"
        Width="800">
    <Grid>
        <!-- NativeViewHost는 HWND만 생성하며 외부 CEF, OpenGL, VLC 등이 올라갈 수 있는 자리입니다 -->
        <smartgis:NativeViewHost x:Name="nativeView"
                                 Width="640"
                                 Height="360"
                                 HorizontalAlignment="Center"
                                 VerticalAlignment="Center"/>
    </Grid>
</Window>
//////////
windowInfo.SetAsChild(nativeWindowHost.Handle, ...);

    RECT rect;
    GetClientRect(hwnd, &rect);
    CefWindowInfo window;
    _windowInfo->SetAsChild(hwnd, rect);


    VideoHwndHost? _videoHwndHost
    _videoHwndHost.Handle;

