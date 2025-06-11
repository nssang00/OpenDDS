using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Interop;
using System.Windows;

namespace SmartGISharp.Wpf
{
    public class NativeViewHost : HwndHost
    {
#if DEBUG
        public static bool UseDebugConsole { get; set; } = false;
#else
        public static bool UseDebugConsole { get; set; } = false;
#endif
        public static bool EnableFileOutput { get; set; } = false;

        public event Action<int, IntPtr, IntPtr> OnPostMessage;        

        private static bool _consoleAllocated;
        private static readonly object _sync = new object();

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

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool AllocConsole();            

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

            lock (_sync)
            {
                if (UseDebugConsole && !_consoleAllocated)
                {
                    AllocConsole();
                    _consoleAllocated = true;
                }

                if (EnableFileOutput && !(Console.Out is ConsoleFileWriter))
                    Console.SetOut(new ConsoleFileWriter("console.log"));
            }
            Console.WriteLine($"[NativeViewHost] HWND: 0x{hwnd.ToInt64():X}");

            return new HandleRef(this, hwnd);
        }

        protected override void DestroyWindowCore(HandleRef hwnd)
        {
            DestroyWindow(hwnd.Handle);
        }

        private Rect _prevRect = Rect.Empty;
        
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
            
            if (!rcBoundingBox.Size.Equals(_prevRect.Size) && _consoleAllocated)
            {
                _prevRect = rcBoundingBox;
                Console.WriteLine($"[NativeViewHost] Resize: {(int)rcBoundingBox.Width}×{(int)rcBoundingBox.Height}");
            }
        }

        protected override IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
        {
            const int WM_USER = 0x0400;
            if (msg >= WM_USER)
            {
                if(OnPostMessage != null)
                    OnPostMessage(msg, wParam, lParam);
            }
            return base.WndProc(hwnd, msg, wParam, lParam, ref handled);
        }        

        private class ConsoleFileWriter : TextWriter
        {
            private readonly TextWriter _consoleWriter;
            private readonly StreamWriter _fileWriter;

            public override Encoding Encoding => Encoding.UTF8;

            public ConsoleFileWriter(string filePath)
            {
                _consoleWriter = Console.Out;
                _fileWriter = new StreamWriter(filePath, false, Encoding.UTF8) 
                { 
                    AutoFlush = true 
                };
            }

            public override void Write(char value)
            {
                _consoleWriter.Write(value);
                _fileWriter.Write(value);
            }

            public override void Write(string value)
            {
                _consoleWriter.Write(value);
                _fileWriter.Write(value);
            }

            public override void WriteLine(string value)
            {
                _consoleWriter.WriteLine(value);
                _fileWriter.WriteLine(value);
            }
        }
    }
}
