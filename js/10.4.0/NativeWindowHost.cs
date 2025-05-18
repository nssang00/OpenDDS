using System;
using System.Windows;
using System.Windows.Interop;

public class NativeHost : HwndHost
{
    private IntPtr _hwnd;

    protected override HandleRef BuildWindowCore(IntPtr hwndParent)
    {
        // 자식 HWND 생성. (WS_CHILD, WS_VISIBLE 등)
        _hwnd = NativeMethods.CreateWindowEx(
            0, "STATIC", "",
            NativeMethods.WS_CHILD | NativeMethods.WS_VISIBLE,
            0, 0, (int)Width, (int)Height,
            hwndParent, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero
        );
        return new HandleRef(this, _hwnd);
    }

    protected override void DestroyWindowCore(HandleRef hwnd)
    {
        NativeMethods.DestroyWindow(hwnd.Handle);
        _hwnd = IntPtr.Zero;
    }

    public IntPtr ChildHwnd => _hwnd;
}

// Win32 API P/Invoke 래퍼
internal static class NativeMethods
{
    public const int WS_CHILD = 0x40000000;
    public const int WS_VISIBLE = 0x10000000;

    [System.Runtime.InteropServices.DllImport("user32.dll", CharSet = System.Runtime.InteropServices.CharSet.Auto)]
    public static extern IntPtr CreateWindowEx(
        int dwExStyle, string lpClassName, string lpWindowName,
        int dwStyle, int x, int y, int nWidth, int nHeight,
        IntPtr hWndParent, IntPtr hMenu, IntPtr hInstance, IntPtr lpParam);

    [System.Runtime.InteropServices.DllImport("user32.dll", SetLastError = true)]
    public static extern bool DestroyWindow(IntPtr hWnd);
}

/////
public class NativeWindowHost : HwndHost
{
    private IntPtr _hwnd;

    protected override HandleRef BuildWindowCore(HandleRef hwndParent)
    {
        _hwnd = CreateWindowEx(0, "static", "",
            WS_CHILD | WS_VISIBLE,
            0, 0, 300, 200,
            hwndParent.Handle, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);

        return new HandleRef(this, _hwnd);
    }

    protected override void DestroyWindowCore(HandleRef hwnd)
    {
        DestroyWindow(hwnd.Handle);
    }

    private const int WS_CHILD = 0x40000000;
    private const int WS_VISIBLE = 0x10000000;

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CreateWindowEx(
        int exStyle, string className, string windowName, int style,
        int x, int y, int width, int height,
        IntPtr hwndParent, IntPtr hMenu, IntPtr hInstance, IntPtr lpParam);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool DestroyWindow(IntPtr hWnd);
}


//////
<Window x:Class="MyApp.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:native="clr-namespace:Wpf;assembly=SmartGISharp"
        Title="NativeWindowHost Demo" Height="300" Width="400">
    <Grid>
        <native:NativeWindowHost />
    </Grid>
</Window>
