MainWindow.xaml
<Window x:Class="CefMapDemo.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:local="clr-namespace:CefMapDemo"
        Title="MainWindow" Height="720" Width="1080">
    <Grid>
        <!-- 단순 HWND 생성용 뷰 -->
        <local:NativeHostView x:Name="nativeView" Width="800" Height="600" />
    </Grid>
</Window>

MainWindow.xaml.cs
public partial class MainWindow : Window
{
    private Map2d map;

    public MainWindow()
    {
        InitializeComponent();

        // NativeHostView를 map2d에 연결
        map = new Map2d(nativeView);
    }
}

[GisApp.exe]                        ← C# GIS 애플리케이션 실행 파일
        |
        | 참조
        ▼
    [SmartGISharp.dll]                 ← C# 전용 SWIG 바인딩 (SWIG가 생성한 mylib.cs 빌드)
        |
        | P/Invoke (DllImport)
        ▼
    [smartgis_csharp.dll]             ← SWIG C++ wrapper (mylib_wrap.cxx 빌드)
        |
        | 정적 또는 동적 링크
        ▼
    [MapEngine.dll]                   ← 실제 GIS 엔진 로직 (C++로 작성된 핵심 라이브러리)
        |
        | 링크/의존성
        ▼─────────────────────────────┬─────────────────────┬────────────────────┐
    [WebEngineView.dll]              [GeoMath.dll]       [Projection.dll]   [RasterIO.dll]
       ↑                             ↑                      ↑                  ↑
       |                             |                      |                  |
     네이티브 HWND 렌더링       좌표계/연산             투영 변환 기능      래스터 파일 I/O 등
