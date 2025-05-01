using System;
using System.ComponentModel;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Effects;
using Microsoft.Web.WebView2.Core;

namespace Microsoft.Web.WebView2.Wpf;

[ToolboxItem(true)]
public class WebView2 : HwndHost, IWebView2, IDisposable
{
	private static class NativeMethods
	{
		[Flags]
		public enum WS : uint
		{
			None = 0u,
			CLIPCHILDREN = 0x2000000u,
			VISIBLE = 0x10000000u,
			CHILD = 0x40000000u
		}

		[Flags]
		public enum WS_EX : uint
		{
			None = 0u,
			TRANSPARENT = 0x20u
		}

		public enum WM : uint
		{
			SETFOCUS = 7u,
			PAINT = 15u
		}

		public struct Rect
		{
			public int left;

			public int top;

			public int right;

			public int bottom;
		}

		public struct PaintStruct
		{
			public IntPtr hdc;

			public bool fErase;

			public Rect rcPaint;

			public bool fRestore;

			public bool fIncUpdate;

			[MarshalAs(UnmanagedType.ByValArray, SizeConst = 32)]
			public byte[] rgbReserved;
		}

		[DllImport("user32.dll", SetLastError = true)]
		public static extern IntPtr BeginPaint(IntPtr hwnd, out PaintStruct lpPaint);

		[DllImport("user32.dll", SetLastError = true)]
		public static extern bool EndPaint(IntPtr hwnd, ref PaintStruct lpPaint);

		[DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
		public static extern IntPtr CreateWindowExW(WS_EX dwExStyle, [MarshalAs(UnmanagedType.LPWStr)] string lpClassName, [MarshalAs(UnmanagedType.LPWStr)] string lpWindowName, WS dwStyle, int x, int y, int nWidth, int nHeight, IntPtr hWndParent, IntPtr hMenu, IntPtr hInstance, IntPtr lpParam);

		[DllImport("user32.dll", SetLastError = true)]
		[return: MarshalAs(UnmanagedType.Bool)]
		public static extern bool DestroyWindow(IntPtr hwnd);
	}

	internal WebView2Base m_webview2Base;

	public static readonly DependencyProperty CreationPropertiesProperty = WebView2Base.CreationPropertiesProperty.AddOwner(typeof(WebView2));

	public static readonly DependencyProperty SourceProperty = WebView2Base.SourceProperty.AddOwner(typeof(WebView2));

	public static readonly DependencyProperty CanGoBackProperty = WebView2Base.CanGoBackProperty.AddOwner(typeof(WebView2));

	public static readonly DependencyProperty CanGoForwardProperty = WebView2Base.CanGoForwardProperty.AddOwner(typeof(WebView2));

	public static readonly DependencyProperty ZoomFactorProperty = WebView2Base.ZoomFactorProperty.AddOwner(typeof(WebView2));

	public static readonly DependencyProperty DefaultBackgroundColorProperty = WebView2Base.DefaultBackgroundColorProperty.AddOwner(typeof(WebView2));

	public static readonly DependencyProperty AllowExternalDropProperty = WebView2Base.AllowExternalDropProperty.AddOwner(typeof(WebView2));

	public static readonly DependencyProperty DesignModeForegroundColorProperty = WebView2Base.DesignModeForegroundColorProperty.AddOwner(typeof(WebView2));

	[Category("Common")]
	public CoreWebView2CreationProperties CreationProperties
	{
		get
		{
			return (CoreWebView2CreationProperties)GetValue(CreationPropertiesProperty);
		}
		set
		{
			SetValue(CreationPropertiesProperty, value);
		}
	}

	[Browsable(false)]
	public CoreWebView2 CoreWebView2 => m_webview2Base.CoreWebView2;

	[Category("Common")]
	public Uri Source
	{
		get
		{
			return (Uri)GetValue(SourceProperty);
		}
		set
		{
			SetValue(SourceProperty, value);
		}
	}

	[Browsable(false)]
	public bool CanGoBack => (bool)GetValue(CanGoBackProperty);

	[Browsable(false)]
	public bool CanGoForward => (bool)GetValue(CanGoForwardProperty);

	[Category("Common")]
	public double ZoomFactor
	{
		get
		{
			return (double)GetValue(ZoomFactorProperty);
		}
		set
		{
			SetValue(ZoomFactorProperty, value);
		}
	}

	[Category("Common")]
	public System.Drawing.Color DefaultBackgroundColor
	{
		get
		{
			return (System.Drawing.Color)GetValue(DefaultBackgroundColorProperty);
		}
		set
		{
			SetValue(DefaultBackgroundColorProperty, value);
		}
	}

	[Category("Common")]
	public bool AllowExternalDrop
	{
		get
		{
			return (bool)GetValue(AllowExternalDropProperty);
		}
		set
		{
			SetValue(AllowExternalDropProperty, value);
		}
	}

	[Category("Common")]
	public System.Drawing.Color DesignModeForegroundColor
	{
		get
		{
			return (System.Drawing.Color)GetValue(DesignModeForegroundColorProperty);
		}
		set
		{
			SetValue(DesignModeForegroundColorProperty, value);
		}
	}

	protected bool IsInDesignMode => DesignerProperties.GetIsInDesignMode(this);

	[Browsable(false)]
	[EditorBrowsable(EditorBrowsableState.Never)]
	public new System.Windows.Media.Brush OpacityMask => base.OpacityMask;

	[Browsable(false)]
	[EditorBrowsable(EditorBrowsableState.Never)]
	public new double Opacity => base.Opacity;

	[Browsable(false)]
	[EditorBrowsable(EditorBrowsableState.Never)]
	public new Effect Effect => base.Effect;

	[Browsable(false)]
	[EditorBrowsable(EditorBrowsableState.Never)]
	public new ContextMenu ContextMenu => base.ContextMenu;

	[Browsable(false)]
	[EditorBrowsable(EditorBrowsableState.Never)]
	public new Style FocusVisualStyle => base.FocusVisualStyle;

	[Browsable(false)]
	[EditorBrowsable(EditorBrowsableState.Never)]
	public new InputScope InputScope => base.InputScope;

	public event EventHandler<CoreWebView2InitializationCompletedEventArgs> CoreWebView2InitializationCompleted
	{
		add
		{
			m_webview2Base.CoreWebView2InitializationCompleted += value;
		}
		remove
		{
			m_webview2Base.CoreWebView2InitializationCompleted -= value;
		}
	}

	public event EventHandler<CoreWebView2SourceChangedEventArgs> SourceChanged
	{
		add
		{
			m_webview2Base.SourceChanged += value;
		}
		remove
		{
			m_webview2Base.SourceChanged -= value;
		}
	}

	public event EventHandler<CoreWebView2NavigationStartingEventArgs> NavigationStarting
	{
		add
		{
			m_webview2Base.NavigationStarting += value;
		}
		remove
		{
			m_webview2Base.NavigationStarting -= value;
		}
	}

	public event EventHandler<CoreWebView2NavigationCompletedEventArgs> NavigationCompleted
	{
		add
		{
			m_webview2Base.NavigationCompleted += value;
		}
		remove
		{
			m_webview2Base.NavigationCompleted -= value;
		}
	}

	public event EventHandler<EventArgs> ZoomFactorChanged
	{
		add
		{
			m_webview2Base.ZoomFactorChanged += value;
		}
		remove
		{
			m_webview2Base.ZoomFactorChanged -= value;
		}
	}

	public event EventHandler<CoreWebView2ContentLoadingEventArgs> ContentLoading
	{
		add
		{
			m_webview2Base.ContentLoading += value;
		}
		remove
		{
			m_webview2Base.ContentLoading -= value;
		}
	}

	public event EventHandler<CoreWebView2WebMessageReceivedEventArgs> WebMessageReceived
	{
		add
		{
			m_webview2Base.WebMessageReceived += value;
		}
		remove
		{
			m_webview2Base.WebMessageReceived -= value;
		}
	}

	public WebView2()
	{
		m_webview2Base = new WebView2Base(this);
		base.Loaded += m_webview2Base._implicitInitGate.OnSynchronizationContextExists;
	}

	protected override HandleRef BuildWindowCore(HandleRef hwndParent)
	{
		IntPtr intPtr = NativeMethods.CreateWindowExW(NativeMethods.WS_EX.TRANSPARENT, "static", string.Empty, NativeMethods.WS.CLIPCHILDREN | NativeMethods.WS.VISIBLE | NativeMethods.WS.CHILD, 0, 0, 0, 0, hwndParent.Handle, IntPtr.Zero, Marshal.GetHINSTANCE(typeof(NativeMethods).Module), IntPtr.Zero);
		if (m_webview2Base.CoreWebView2Controller != null)
		{
			ReparentController(intPtr);
		}
		if (!m_webview2Base._hwndTaskSource.Task.IsCompleted)
		{
			m_webview2Base._hwndTaskSource.SetResult(intPtr);
		}
		return new HandleRef(null, intPtr);
	}

	protected override void DestroyWindowCore(HandleRef hwnd)
	{
		if (m_webview2Base.CoreWebView2Controller != null)
		{
			ReparentController(IntPtr.Zero);
		}
		NativeMethods.DestroyWindow(hwnd.Handle);
	}

	protected override IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
	{
		switch ((NativeMethods.WM)msg)
		{
		case NativeMethods.WM.SETFOCUS:
			m_webview2Base.SafeAccessController(delegate
			{
				m_webview2Base.CoreWebView2Controller.MoveFocus(CoreWebView2MoveFocusReason.Programmatic);
			});
			break;
		case NativeMethods.WM.PAINT:
			if (!IsInDesignMode)
			{
				NativeMethods.BeginPaint(hwnd, out var lpPaint);
				NativeMethods.EndPaint(hwnd, ref lpPaint);
				handled = true;
				return IntPtr.Zero;
			}
			break;
		}
		return base.WndProc(hwnd, msg, wParam, lParam, ref handled);
	}

	protected override void OnRender(DrawingContext dc)
	{
		if (!IsInDesignMode)
		{
			base.OnRender(dc);
		}
		else
		{
			m_webview2Base.OnRender(dc);
		}
	}

	public Task EnsureCoreWebView2Async(CoreWebView2Environment environment = null, CoreWebView2ControllerOptions controllerOptions = null)
	{
		if (IsInDesignMode)
		{
			return Task.FromResult(0);
		}
		return m_webview2Base.EnsureCoreWebView2Async(environment, controllerOptions);
	}

	public Task EnsureCoreWebView2Async(CoreWebView2Environment environment)
	{
		if (IsInDesignMode)
		{
			return Task.FromResult(0);
		}
		return m_webview2Base.EnsureCoreWebView2Async(environment);
	}

	protected override void Dispose(bool disposing)
	{
		if (!m_webview2Base._disposed)
		{
			m_webview2Base.Dispose();
			base.Dispose(disposing);
		}
	}

	public override void BeginInit()
	{
		base.BeginInit();
		m_webview2Base.BeginInit();
	}

	public override void EndInit()
	{
		m_webview2Base.EndInit();
		base.EndInit();
	}

	internal void ReparentController(IntPtr hwnd, bool sync = true)
	{
		if (hwnd == IntPtr.Zero)
		{
			m_webview2Base.CoreWebView2Controller.IsVisible = false;
			m_webview2Base.CoreWebView2Controller.ParentWindow = IntPtr.Zero;
			return;
		}
		m_webview2Base.CoreWebView2Controller.ParentWindow = hwnd;
		if (sync)
		{
			SyncControllerWithParentWindow();
		}
	}

	internal void SyncControllerWithParentWindow()
	{
		UpdateWindowPos();
		if (Keyboard.FocusedElement == this)
		{
			m_webview2Base.CoreWebView2Controller.MoveFocus(CoreWebView2MoveFocusReason.Programmatic);
		}
		m_webview2Base.CoreWebView2Controller.IsVisible = base.Visibility == Visibility.Visible;
	}

	protected override void OnWindowPositionChanged(Rect rcBoundingBox)
	{
		base.OnWindowPositionChanged(rcBoundingBox);
		m_webview2Base.SafeAccessController(delegate
		{
			m_webview2Base.CoreWebView2Controller.Bounds = new Rectangle(0, 0, Convert.ToInt32(rcBoundingBox.Size.Width), Convert.ToInt32(rcBoundingBox.Size.Height));
			m_webview2Base.CoreWebView2Controller.NotifyParentWindowPositionChanged();
		});
	}

	protected override bool TabIntoCore(TraversalRequest request)
	{
		return m_webview2Base.SafeAccessController(delegate
		{
			if (CoreWebView2 == null)
			{
				return base.TabIntoCore(request);
			}
			switch (request.FocusNavigationDirection)
			{
			case FocusNavigationDirection.Next:
			case FocusNavigationDirection.First:
				m_webview2Base.CoreWebView2Controller.MoveFocus(CoreWebView2MoveFocusReason.Next);
				return true;
			case FocusNavigationDirection.Previous:
			case FocusNavigationDirection.Last:
				m_webview2Base.CoreWebView2Controller.MoveFocus(CoreWebView2MoveFocusReason.Previous);
				return true;
			default:
				return base.TabIntoCore(request);
			}
		}, defaultReturnValue: false);
	}

	protected override void OnGotKeyboardFocus(KeyboardFocusChangedEventArgs e)
	{
		base.OnGotKeyboardFocus(e);
		m_webview2Base.SafeAccessController(delegate
		{
			m_webview2Base.CoreWebView2Controller.MoveFocus(CoreWebView2MoveFocusReason.Programmatic);
		});
	}

	protected override void OnKeyDown(KeyEventArgs e)
	{
		base.OnKeyDown(e);
	}

	protected override void OnKeyUp(KeyEventArgs e)
	{
		base.OnKeyUp(e);
	}

	protected override void OnPreviewKeyDown(KeyEventArgs e)
	{
		base.OnPreviewKeyDown(e);
		if (!m_webview2Base._browserHitTransparent && e is WebView2Base.WebView2KeyEventArgs)
		{
			e.RoutedEvent = UIElement.KeyDown;
			RaiseEvent(e);
		}
	}

	protected override void OnPreviewKeyUp(KeyEventArgs e)
	{
		base.OnPreviewKeyUp(e);
		if (!m_webview2Base._browserHitTransparent && e is WebView2Base.WebView2KeyEventArgs)
		{
			e.RoutedEvent = UIElement.KeyUp;
			RaiseEvent(e);
		}
	}

	public void GoBack()
	{
		m_webview2Base.GoBack();
	}

	public void GoForward()
	{
		m_webview2Base.GoForward();
	}

	public void Reload()
	{
		m_webview2Base.Reload();
	}

	public void Stop()
	{
		m_webview2Base.Stop();
	}

	public void NavigateToString(string htmlContent)
	{
		m_webview2Base.NavigateToString(htmlContent);
	}

	public async Task<string> ExecuteScriptAsync(string javaScript)
	{
		return await m_webview2Base.ExecuteScriptAsync(javaScript);
	}
}
