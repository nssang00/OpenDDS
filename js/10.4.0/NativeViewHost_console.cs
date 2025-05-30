// NativeViewHost.cs
// SmartGISharp.Wpf ― HwndHost 기반 네이티브 뷰 컨테이너 + 디버그 콘솔 옵션
using System;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;

namespace SmartGISharp.Wpf
{
    public class NativeViewHost : HwndHost
    {
        /*───────────────────────────────────────────────────────────────
         * 1) 디버그 콘솔 옵션
         *    - ShowDebugConsole : 첫 BuildWindowCore 실행 전에 true면
         *      AllocConsole()을 한 번만 호출한다.
         *──────────────────────────────────────────────────────────────*/
#if DEBUG
        public static bool ShowDebugConsole = true;   // DEBUG 빌드 기본 ON
#else
        public static bool ShowDebugConsole = false;  // Release 빌드 기본 OFF
#endif
        private static bool _consoleAllocated;         // 중복 호출 방지

        /*───────────────────────────────────────────────────────────────
         * 2) Win32 상수 & P/Invoke
         *──────────────────────────────────────────────────────────────*/
        private const int WS_CHILD       = 0x40000000;
        private const int WS_VISIBLE     = 0x10000000;
        private const int SWP_NOZORDER   = 0x0004;
        private const int SWP_NOACTIVATE = 0x0010;

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool AllocConsole();

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

        /*───────────────────────────────────────────────────────────────
         * 3) HwndHost 구현
         *──────────────────────────────────────────────────────────────*/
        protected override HandleRef BuildWindowCore(HandleRef hwndParent)
        {
            // ── 콘솔 창이 아직 없고 옵션이 켜져 있으면 한 번만 생성 ──
            if (ShowDebugConsole && !_consoleAllocated)
            {
                AllocConsole();
                Console.Title = "SmartGISharp Debug Console";
                Console.WriteLine("=== Debug console attached by NativeViewHost ===");
                _consoleAllocated = true;
            }

            IntPtr hwnd = CreateWindowEx(
                0,                          // dwExStyle
                "static",                  // lpClassName
                "",                        // lpWindowName
                WS_CHILD | WS_VISIBLE,     // dwStyle
                0, 0,                      // x, y
                (int)ActualWidth,          // nWidth
                (int)ActualHeight,         // nHeight
                hwndParent.Handle,         // hWndParent
                IntPtr.Zero,               // hMenu
                IntPtr.Zero,               // hInstance
                IntPtr.Zero);              // lpParam

            return new HandleRef(this, hwnd);
        }

        protected override void DestroyWindowCore(HandleRef hwnd)
        {
            DestroyWindow(hwnd.Handle);
        }

        protected override void OnWindowPositionChanged(Rect rc)
        {
            base.OnWindowPositionChanged(rc);

            if (Handle != IntPtr.Zero)
            {
                SetWindowPos(
                    Handle,
                    IntPtr.Zero,
                    (int)rc.X,
                    (int)rc.Y,
                    (int)rc.Width,
                    (int)rc.Height,
                    SWP_NOZORDER | SWP_NOACTIVATE);
            }
        }
    }
}
