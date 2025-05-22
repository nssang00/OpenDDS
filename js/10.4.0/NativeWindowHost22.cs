using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;

namespace SmartGISharp.Wpf
{
    public class NativeWindowHost : HwndHost
    {
        private const int WS_CHILD       = 0x40000000;
        private const int WS_VISIBLE     = 0x10000000;
        private const int SWP_NOZORDER   = 0x0004;
        private const int SWP_NOACTIVATE = 0x0010;

        [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern IntPtr CreateWindowEx(int dwExStyle,
                                                    string lpszClassName,
                                                    string lpszWindowName,
                                                    int style,
                                                    int x, int y,
                                                    int width, int height,
                                                    IntPtr hwndParent,
                                                    IntPtr hMenu,
                                                    IntPtr hInst,
                                                    IntPtr param);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool DestroyWindow(IntPtr hWnd);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool SetWindowPos(
            IntPtr hWnd, IntPtr insertAfter, int x, int y, int w, int h, int flags);

        public static readonly DependencyProperty UrlProperty =
            DependencyProperty.Register(
                nameof(Url), typeof(string), typeof(NativeWindowHost),
                new PropertyMetadata(null));

        public string? Url
        {
            get => (string?)GetValue(UrlProperty);
            set => SetValue(UrlProperty, value);
        }

        protected override HandleRef BuildWindowCore(HandleRef hwndParent)
        {
            IntPtr hwnd = CreateWindowEx(0, "static", "",
                WS_CHILD | WS_VISIBLE,
                0, 0,
                (int)ActualWidth, (int)ActualHeight,
                hwndParent.Handle,
                IntPtr.Zero,
                IntPtr.Zero,
                IntPtr.Zero);

            return new HandleRef(this, _hostHwnd);
        }

        protected override void DestroyWindowCore(HandleRef hwnd)
        {
            DestroyWindow(hwnd.Handle);
        }

        protected override void OnWindowPositionChanged(Rect rc)
        {
            base.OnWindowPositionChanged(rc);
            if (_hostHwnd != IntPtr.Zero)
            {
                SetWindowPos(_hostHwnd, IntPtr.Zero, 0, 0,
                             (int)rc.Width, (int)rc.Height,
                             SWP_NOZORDER | SWP_NOACTIVATE);
            }
        }
    }
}

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

//////////
windowInfo.SetAsChild(nativeWindowHost.Handle, ...);

    RECT rect;
    GetClientRect(hwnd, &rect);
    CefWindowInfo window;
    _windowInfo->SetAsChild(hwnd, rect);


    VideoHwndHost? _videoHwndHost
    _videoHwndHost.Handle;

