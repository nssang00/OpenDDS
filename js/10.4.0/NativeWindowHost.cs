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
