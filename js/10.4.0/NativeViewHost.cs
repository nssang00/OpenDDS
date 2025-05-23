using System;
using System.Runtime.InteropServices;
using System.Windows.Interop;
using System.Windows;

namespace SmartGISharp.Wpf
{
    public class NativeViewHost : HwndHost
    {
        private const int WS_CHILD       = 0x40000000;
        private const int WS_VISIBLE     = 0x10000000;
        private const int SWP_NOZORDER   = 0x0004;
        private const int SWP_NOACTIVATE = 0x0010;

        [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern IntPtr CreateWindowEx(
            int dwExStyle, string lpClassName, string lpWindowName, int dwStyle,
            int x, int y, int nWidth, int nHeight,
            IntPtr hWndParent, IntPtr hMenu, IntPtr hInstance, IntPtr lpParam);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool DestroyWindow(IntPtr hWnd);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool SetWindowPos(
            IntPtr hWnd, IntPtr insertAfter, int x, int y, int w, int h, int flags);

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

            return new HandleRef(this, hwnd);
        }

        protected override void DestroyWindowCore(HandleRef hwnd)
        {
            DestroyWindow(hwnd.Handle);
        }

        protected override void OnWindowPositionChanged(Rect rcBoundingBox)
        {
            base.OnWindowPositionChanged(rcBoundingBox);
            if (Handle != IntPtr.Zero)
            {
                SetWindowPos(Handle, IntPtr.Zero, 
                    (int)rcBoundingBox.X, (int)rcBoundingBox.Y,
                    (int)rcBoundingBox.Width, (int)rcBoundingBox.Height,
                    SWP_NOZORDER | SWP_NOACTIVATE);
            }
        }
    }
}
