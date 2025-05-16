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
