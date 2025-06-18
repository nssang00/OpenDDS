using System; using System.Windows.Forms;

namespace SmartGISharp.WinForms { /// <summary> /// WinForms용 네이티브 HWND 호스트 컨트롤입니다. /// 외부 WebView2, CEF, DirectX 등 HWND 기반 컨트롤과 연동 가능하며, /// WndProc을 통해 PostMessage 등의 Win32 메시지를 수신할 수 있습니다. /// </summary> public class NativeViewHost : Control { /// <summary> /// Win32 메시지(PostMessage 등) 수신 시 발생합니다. /// </summary> public event Action<int, IntPtr, IntPtr> NativeMessageReceived;

/// <summary>
    /// WndProc 오버라이드: 사용자 메시지 수신 처리
    /// </summary>
    protected override void WndProc(ref Message m)
    {
        const int WM_USER = 0x0400;
        if (m.Msg >= WM_USER)
        {
            NativeMessageReceived?.Invoke(m.Msg, m.WParam, m.LParam);
            m.Result = IntPtr.Zero;
            return;
        }
        base.WndProc(ref m);
    }
}

/// <summary>
/// 사용 예시 (Form 내부에서)
/// </summary>
public class MainForm : Form
{
    public MainForm()
    {
        var nativeView = new NativeViewHost
        {
            Dock = DockStyle.Fill
        };
        nativeView.NativeMessageReceived += (msg, wParam, lParam) =>
        {
            Console.WriteLine($"Received: 0x{msg:X}, wParam: {wParam}, lParam: {lParam}");
        };
        this.Controls.Add(nativeView);

        this.Load += (s, e) =>
        {
            var hwnd = nativeView.Handle;
            Console.WriteLine($"NativeView HWND: 0x{hwnd.ToInt64():X}");

            // 예시: 외부 네이티브 컨트롤 삽입 또는 PostMessage 대상 연결
        };
    }
}

}

