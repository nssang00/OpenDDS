<Window x:Class="WpfApp1.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:d="http://schemas.microsoft.com/expression/blend/2008"
        xmlns:wv2="clr-namespace:Microsoft.Web.WebView2.Wpf;assembly=Microsoft.Web.WebView2.Wpf"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="MainWindow" Height="450" Width="800">
    <Grid>
        <wv2:WebView2 Name="webView"/>
    </Grid>
</Window>

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
        webView.CoreWebView2.NavigateToString("<html><body><h1>WebView2 Add Test</h1></body></html>");

        await Task.Delay(100); // 잠깐 대기

        int a = 123, b = 456;
        int loopCount = 1000;
        var sw = new System.Diagnostics.Stopwatch();
        sw.Start();

        for (int i = 0; i < loopCount; i++)
        {
            string js = $"(function() {{ return {a} + {b}; }})()";
            string result = await webView.ExecuteScriptAsync(js);

            // 필요 시 검증
            if (result != "579") throw new Exception("Unexpected result");
        }

        sw.Stop();
        MessageBox.Show($"1000번 실행 시간: {sw.ElapsedMilliseconds} ms");
    }
}
