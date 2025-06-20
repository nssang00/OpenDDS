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

await webView.EnsureCoreWebView2Async();

webView.CoreWebView2.NavigateToString(@"
  <html>
  <body>
    <script>
      async function asyncAdd(a, b) {
        await new Promise(r => setTimeout(r, 10));
        return a + b;
      }
    </script>
  </body>
  </html>
");

await Task.Delay(100); // 함수 정의 기다림

string result = await webView.ExecuteScriptAsync("asyncAdd(3, 7)");
result = result.Trim('"');
MessageBox.Show($"결과: {result}");



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

            // JS 함수 정의 포함한 HTML 주입
            string html = @"
                <html>
                <body><h2>WebView2 Ready</h2></body>
                <script>
                    function add(a, b) {
                        return a + b;
                    }
                </script>
                </html>";

            webView.CoreWebView2.NavigateToString(html);
        }

        private async void TestButton_Click(object sender, RoutedEventArgs e)
        {
            int a = 123, b = 456;
            int expected = a + b;
            int loopCount = 1000;

            var sw = Stopwatch.StartNew();

            for (int i = 0; i < loopCount; i++)
            {
                string jsCall = $"add({a}, {b})";
                string result = await webView.ExecuteScriptAsync(jsCall);
                result = result.Trim('"');

                if (result != expected.ToString())
                {
                    MessageBox.Show($"오류: i={i}, 결과={result}");
                    return;
                }
            }

            sw.Stop();
            MessageBox.Show($"1000번 계산 완료!\n소요 시간: {sw.ElapsedMilliseconds} ms");
        }

        private void ResetButton_Click(object sender, RoutedEventArgs e)
        {
            webView.CoreWebView2.NavigateToString("<html><body><h2>초기화 완료</h2></body></html>");
        }
    }
}

