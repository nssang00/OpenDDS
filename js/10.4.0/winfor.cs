using System;
using System.Windows.Forms;

public class MainForm : Form
{
    public MainForm()
    {
        this.Text = "Minimal WebView Sample";
        this.Size = new System.Drawing.Size(800, 600);

        var webViewHost = new Panel
        {
            Dock = DockStyle.Fill
        };

        var buttonBar = new Panel
        {
            Dock = DockStyle.Bottom,
            Height = 50
        };

        var buttonBack = new Button { Text = "뒤로", Left = 10, Width = 80, Top = 10 };
        var buttonForward = new Button { Text = "앞으로", Left = 100, Width = 80, Top = 10 };

        buttonBack.Click += (s, e) => Console.WriteLine("뒤로 클릭");
        buttonForward.Click += (s, e) => Console.WriteLine("앞으로 클릭");

        buttonBar.Controls.Add(buttonBack);
        buttonBar.Controls.Add(buttonForward);
        this.Controls.Add(webViewHost);
        this.Controls.Add(buttonBar);

        this.Load += (s, e) =>
        {
            IntPtr hwnd = webViewHost.Handle;
            Console.WriteLine($"WebView HWND: {hwnd}");

            // 여기서 WebView를 webViewHost에 붙이면 됨
            // ex) var webView = new ChromiumWebBrowser("https://example.com");
            //      webView.Dock = DockStyle.Fill;
            //      webViewHost.Controls.Add(webView);
        };
    }

    [STAThread]
    public static void Main()
    {
        Application.Run(new MainForm());
    }
}
