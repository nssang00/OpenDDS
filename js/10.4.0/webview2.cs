<Window x:Class="WebView2Test.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:wv2="clr-namespace:Microsoft.Web.WebView2.Wpf;assembly=Microsoft.Web.WebView2.Wpf"
        Title="WebView2 Add Test" Height="450" Width="800">
    <Grid>
        <Grid.RowDefinitions>
            <RowDefinition Height="*" />       <!-- WebView2 -->
            <RowDefinition Height="Auto" />    <!-- 하단 UI -->
        </Grid.RowDefinitions>

        <!-- WebView2 내용 -->
        <wv2:WebView2 x:Name="webView" Grid.Row="0" />

        <!-- 하단 버튼 패널 -->
        <StackPanel Orientation="Horizontal"
                    HorizontalAlignment="Center"
                    Margin="10"
                    Grid.Row="1"
                    >
            <Button Content="1000번 더하기 테스트"
                    Click="TestButton_Click"
                    Margin="5" />

            <!-- 예: 추가 버튼 -->
            <Button Content="초기화"
                    Click="ResetButton_Click"
                    Margin="5" />
        </StackPanel>
    </Grid>
</Window>


using System;
using System.Diagnostics;
using System.Threading.Tasks;
using System.Windows;

namespace WebView2Test
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            Loaded += MainWindow_Loaded;
        }

        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            await webView.EnsureCoreWebView2Async();
            webView.CoreWebView2.NavigateToString("<html><body><h2>WebView2 Ready</h2></body></html>");
        }

        private async void TestButton_Click(object sender, RoutedEventArgs e)
        {
            int a = 123;
            int b = 456;
            int loopCount = 1000;
            int expected = a + b;

            var sw = Stopwatch.StartNew();

            for (int i = 0; i < loopCount; i++)
            {
                string js = $"(function() {{ return {a} + {b}; }})()";
                string result = await webView.ExecuteScriptAsync(js);
                result = result.Trim('"'); // 문자열 처리
                if (result != expected.ToString())
                {
                    MessageBox.Show($"Unexpected result at i={i}: {result}");
                    return;
                }
            }

            sw.Stop();
            MessageBox.Show($"1000번 계산 완료!\n소요 시간: {sw.ElapsedMilliseconds} ms");
        }
    }
}
