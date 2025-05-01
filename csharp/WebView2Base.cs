#define TRACE
using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using Microsoft.Web.WebView2.Core;

namespace Microsoft.Web.WebView2.Wpf;

internal class WebView2Base : DependencyObject, IWebView2, IDisposable
{
	internal class WebView2KeyEventArgs : KeyEventArgs
	{
		public WebView2KeyEventArgs(KeyboardDevice keyboard, PresentationSource inputSource, int timestamp, Key key)
			: base(keyboard, inputSource, timestamp, key)
		{
		}
	}

	private FrameworkElement m_element;

	public static readonly DependencyProperty CreationPropertiesProperty = DependencyProperty.RegisterAttached("CreationProperties", typeof(CoreWebView2CreationProperties), typeof(WebView2Base), new PropertyMetadata(null, null, CoerceCreationPropertiesProperty));

	private Task _initTask;

	internal bool _browserHitTransparent;

	private bool _isExplicitEnvironment;

	private bool _isExplicitControllerOptions;

	internal TaskCompletionSource<IntPtr> _hwndTaskSource = new TaskCompletionSource<IntPtr>();

	internal bool _disposed;

	private bool _browserCrashed;

	internal ImplicitInitGate _implicitInitGate = new ImplicitInitGate();

	private DependencyProperty _propertyChangingFromCore;

	public static readonly DependencyProperty SourceProperty = DependencyProperty.RegisterAttached("Source", typeof(Uri), typeof(WebView2Base), new PropertyMetadata(null, SourcePropertyChanged, null), SourcePropertyValid);

	public static readonly DependencyPropertyKey CanGoBackPropertyKey = DependencyProperty.RegisterAttachedReadOnly("CanGoBack", typeof(bool), typeof(WebView2Base), new PropertyMetadata(false));

	public static readonly DependencyProperty CanGoBackProperty = CanGoBackPropertyKey.DependencyProperty;

	private static readonly DependencyPropertyKey CanGoForwardPropertyKey = DependencyProperty.RegisterAttachedReadOnly("CanGoForward", typeof(bool), typeof(WebView2Base), new PropertyMetadata(false));

	public static readonly DependencyProperty CanGoForwardProperty = CanGoForwardPropertyKey.DependencyProperty;

	public static readonly DependencyProperty ZoomFactorProperty = DependencyProperty.RegisterAttached("ZoomFactor", typeof(double), typeof(WebView2Base), new PropertyMetadata(1.0, null, CoerceZoomFactorPropertyChanged));

	public static readonly DependencyProperty DefaultBackgroundColorProperty = DependencyProperty.RegisterAttached("DefaultBackgroundColor", typeof(System.Drawing.Color), typeof(WebView2Base), new PropertyMetadata(System.Drawing.Color.White, DefaultBackgroundColorPropertyChanged, null));

	public static readonly DependencyProperty AllowExternalDropProperty = DependencyProperty.RegisterAttached("AllowExternalDrop", typeof(bool), typeof(WebView2Base), new PropertyMetadata(true, AllowExternalDropPropertyChanged));

	public static readonly DependencyProperty DesignModeForegroundColorProperty = DependencyProperty.RegisterAttached("DesignModeForegroundColor", typeof(System.Drawing.Color), typeof(WebView2Base), new PropertyMetadata(System.Drawing.Color.Black));

	private CoreWebView2Environment Environment { get; set; }

	internal CoreWebView2Controller CoreWebView2Controller { get; set; }

	private CoreWebView2ControllerOptions ControllerOptions { get; set; }

	public CoreWebView2CreationProperties CreationProperties
	{
		get
		{
			return (CoreWebView2CreationProperties)m_element.GetValue(CreationPropertiesProperty);
		}
		set
		{
			m_element.SetValue(CreationPropertiesProperty, value);
		}
	}

	public CoreWebView2 CoreWebView2
	{
		get
		{
			VerifyAccess();
			VerifyNotDisposed();
			VerifyBrowserNotCrashed();
			return CoreWebView2Controller?.CoreWebView2;
		}
	}

	public Uri Source
	{
		get
		{
			return (Uri)m_element.GetValue(SourceProperty);
		}
		set
		{
			m_element.SetValue(SourceProperty, value);
		}
	}

	[Browsable(false)]
	public bool CanGoBack => (bool)m_element.GetValue(CanGoBackProperty);

	[Browsable(false)]
	public bool CanGoForward => (bool)m_element.GetValue(CanGoForwardProperty);

	public double ZoomFactor
	{
		get
		{
			return (double)m_element.GetValue(ZoomFactorProperty);
		}
		set
		{
			m_element.SetValue(ZoomFactorProperty, value);
		}
	}

	public System.Drawing.Color DefaultBackgroundColor
	{
		get
		{
			return (System.Drawing.Color)m_element.GetValue(DefaultBackgroundColorProperty);
		}
		set
		{
			m_element.SetValue(DefaultBackgroundColorProperty, value);
		}
	}

	public bool AllowExternalDrop
	{
		get
		{
			return (bool)m_element.GetValue(AllowExternalDropProperty);
		}
		set
		{
			m_element.SetValue(AllowExternalDropProperty, value);
		}
	}

	public System.Drawing.Color DesignModeForegroundColor
	{
		get
		{
			return (System.Drawing.Color)m_element.GetValue(DesignModeForegroundColorProperty);
		}
		set
		{
			m_element.SetValue(DesignModeForegroundColorProperty, value);
		}
	}

	public event EventHandler<CoreWebView2InitializationCompletedEventArgs> CoreWebView2InitializationCompleted;

	public event EventHandler<CoreWebView2SourceChangedEventArgs> SourceChanged;

	public event EventHandler<CoreWebView2NavigationStartingEventArgs> NavigationStarting;

	public event EventHandler<CoreWebView2NavigationCompletedEventArgs> NavigationCompleted;

	public event EventHandler<EventArgs> ZoomFactorChanged;

	public event EventHandler<CoreWebView2ContentLoadingEventArgs> ContentLoading;

	public event EventHandler<CoreWebView2WebMessageReceivedEventArgs> WebMessageReceived;

	internal WebView2Base(FrameworkElement element)
	{
		m_element = element;
	}

	internal static object CoerceCreationPropertiesProperty(DependencyObject d, object value)
	{
		GetBaseFromElement(d, out var control);
		if (control.Environment != null)
		{
			return DependencyProperty.UnsetValue;
		}
		return value;
	}

	private static void GetBaseFromElement(DependencyObject d, out WebView2Base control)
	{
		if (d is WebView2)
		{
			control = ((WebView2)d).m_webview2Base;
			return;
		}
		throw new InvalidOperationException(((d is FrameworkElement frameworkElement) ? frameworkElement.Name : "UnKnown Control") + " is not a valid WebView2 control");
	}

	internal void OnRender(DrawingContext dc)
	{
		SolidColorBrush brush = new SolidColorBrush(System.Windows.Media.Color.FromArgb(DefaultBackgroundColor.A, DefaultBackgroundColor.R, DefaultBackgroundColor.G, DefaultBackgroundColor.B));
		SolidColorBrush solidColorBrush = new SolidColorBrush(System.Windows.Media.Color.FromArgb(DesignModeForegroundColor.A, DesignModeForegroundColor.R, DesignModeForegroundColor.G, DesignModeForegroundColor.B));
		System.Windows.Media.Pen pen = new System.Windows.Media.Pen(solidColorBrush, 2.0);
		dc.DrawRectangle(brush, pen, new Rect(m_element.RenderSize));
		Typeface typeface = new Typeface("default");
		if (typeface == null && Fonts.SystemTypefaces.Count > 0)
		{
			typeface = Fonts.SystemTypefaces.GetEnumerator().Current;
		}
		System.Windows.Point point = new System.Windows.Point(m_element.RenderSize.Width / 2.0, m_element.RenderSize.Height / 2.0);
		FormattedText formattedText = new FormattedText("WebView2", CultureInfo.CurrentCulture, FlowDirection.LeftToRight, typeface, 20.0, solidColorBrush, VisualTreeHelper.GetDpi(m_element).PixelsPerDip);
		point = new System.Windows.Point(point.X - formattedText.WidthIncludingTrailingWhitespace / 2.0, point.Y - formattedText.Height / 2.0);
		dc.DrawText(formattedText, point);
	}

	internal void SafeAccessController(Action action)
	{
		if (CoreWebView2Controller == null)
		{
			return;
		}
		try
		{
			action();
		}
		catch (InvalidOperationException ex)
		{
			if (ex.InnerException.HResult != -2147019873)
			{
				throw ex;
			}
		}
	}

	internal TResult SafeAccessController<TResult>(Func<TResult> function, TResult defaultReturnValue = default(TResult))
	{
		SafeAccessController(delegate
		{
			defaultReturnValue = function();
		});
		return defaultReturnValue;
	}

	public Task EnsureCoreWebView2Async(CoreWebView2Environment environment = null, CoreWebView2ControllerOptions controllerOptions = null)
	{
		m_element.VerifyAccess();
		VerifyNotDisposed();
		VerifyBrowserNotCrashed();
		if (SynchronizationContext.Current == null)
		{
			throw new InvalidOperationException("EnsureCoreWebView2Async cannot be used before the application's event loop has started running.");
		}
		if (_initTask == null || _initTask.IsFaulted)
		{
			_initTask = Init();
		}
		else
		{
			if ((!_isExplicitEnvironment && environment != null) || (_isExplicitEnvironment && environment != null && Environment != environment))
			{
				throw new ArgumentException("WebView2 was already initialized with a different CoreWebView2Environment. Check to see if the Source property was already set or EnsureCoreWebView2Async was previously called with different values.");
			}
			if ((!_isExplicitControllerOptions && controllerOptions != null) || (_isExplicitControllerOptions && controllerOptions != null && ControllerOptions != controllerOptions))
			{
				throw new ArgumentException("WebView2 was already initialized with a different CoreWebView2ControllerOptions. Check to see if the Source property was already set or EnsureCoreWebView2Async was previously called with different values.");
			}
		}
		return _initTask;
		async Task Init()
		{
			_ = 5;
			try
			{
				if (environment != null)
				{
					Environment = environment;
					_isExplicitEnvironment = true;
				}
				else if (CreationProperties != null)
				{
					CoreWebView2Environment environment2 = await CreationProperties.CreateEnvironmentAsync();
					Environment = environment2;
				}
				if (Environment == null)
				{
					CoreWebView2Environment environment2 = await CoreWebView2Environment.CreateAsync();
					Environment = environment2;
				}
				if (controllerOptions != null)
				{
					ControllerOptions = controllerOptions;
					_isExplicitControllerOptions = true;
				}
				else if (CreationProperties != null)
				{
					ControllerOptions = CreationProperties.CreateCoreWebView2ControllerOptions(Environment);
				}
				if (DefaultBackgroundColor != (System.Drawing.Color)DefaultBackgroundColorProperty.GetMetadata(m_element).DefaultValue)
				{
					System.Environment.SetEnvironmentVariable("WEBVIEW2_DEFAULT_BACKGROUND_COLOR", System.Drawing.Color.FromArgb(DefaultBackgroundColor.ToArgb()).Name);
				}
				if (ControllerOptions != null)
				{
					CoreWebView2Environment environment3 = Environment;
					CoreWebView2Controller coreWebView2Controller = await environment3.CreateCoreWebView2ControllerAsync(await _hwndTaskSource.Task, ControllerOptions);
					CoreWebView2Controller = coreWebView2Controller;
				}
				else
				{
					CoreWebView2Environment environment3 = Environment;
					CoreWebView2Controller coreWebView2Controller = await environment3.CreateCoreWebView2ControllerAsync(await _hwndTaskSource.Task);
					CoreWebView2Controller = coreWebView2Controller;
				}
				try
				{
					_browserHitTransparent = CoreWebView2Controller.IsBrowserHitTransparent;
				}
				catch (NotImplementedException)
				{
				}
				if (!_browserHitTransparent)
				{
					CoreWebView2Controller.AcceleratorKeyPressed += CoreWebView2Controller_AcceleratorKeyPressed;
				}
				CoreWebView2Controller.GotFocus += CoreWebView2Controller_GotFocus;
				CoreWebView2Controller.LostFocus += CoreWebView2Controller_LostFocus;
				CoreWebView2Controller.MoveFocusRequested += CoreWebView2Controller_MoveFocusRequested;
				CoreWebView2Controller.ZoomFactorChanged += CoreWebView2Controller_ZoomFactorChanged;
				CoreWebView2.ContentLoading += CoreWebView2_ContentLoading;
				CoreWebView2.HistoryChanged += CoreWebView2_HistoryChanged;
				CoreWebView2.NavigationCompleted += CoreWebView2_NavigationCompleted;
				CoreWebView2.NavigationStarting += CoreWebView2_NavigationStarting;
				CoreWebView2.ProcessFailed += CoreWebView2_ProcessFailed;
				CoreWebView2.SourceChanged += CoreWebView2_SourceChanged;
				CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
				try
				{
					CoreWebView2.Profile.Deleted += Profile_Deleted;
				}
				catch (NotImplementedException)
				{
				}
				m_element.IsVisibleChanged += UIElement_IsVisibleChanged;
				if (m_element is WebView2)
				{
					if (CoreWebView2Controller.ParentWindow != ((WebView2)m_element).Handle)
					{
						((WebView2)m_element).ReparentController(((WebView2)m_element).Handle, sync: false);
					}
					if (CoreWebView2Controller.ParentWindow != IntPtr.Zero)
					{
						((WebView2)m_element).SyncControllerWithParentWindow();
					}
				}
				bool flag = Source != null;
				if (Source == null)
				{
					SetCurrentValueFromCore(SourceProperty, new Uri(CoreWebView2.Source));
				}
				if (ZoomFactor != (double)ZoomFactorProperty.GetMetadata(m_element).DefaultValue)
				{
					CoreWebView2Controller.ZoomFactor = ZoomFactor;
				}
				if (DefaultBackgroundColor != (System.Drawing.Color)DefaultBackgroundColorProperty.GetMetadata(m_element).DefaultValue)
				{
					CoreWebView2Controller.DefaultBackgroundColor = DefaultBackgroundColor;
				}
				if (AllowExternalDrop != (bool)AllowExternalDropProperty.GetMetadata(m_element).DefaultValue)
				{
					try
					{
						CoreWebView2Controller.AllowExternalDrop = AllowExternalDrop;
					}
					catch (NotImplementedException)
					{
					}
				}
				this.CoreWebView2InitializationCompleted?.Invoke(m_element, new CoreWebView2InitializationCompletedEventArgs());
				if (flag)
				{
					CoreWebView2.Navigate(Source.AbsoluteUri);
				}
			}
			catch (Exception ex4)
			{
				this.CoreWebView2InitializationCompleted?.Invoke(m_element, new CoreWebView2InitializationCompletedEventArgs(ex4));
				throw;
			}
		}
	}

	public Task EnsureCoreWebView2Async(CoreWebView2Environment environment)
	{
		return EnsureCoreWebView2Async(environment, null);
	}

	private void Profile_Deleted(object sender, object e)
	{
		Uninitialize();
	}

	private void VerifyNotDisposed()
	{
		if (_disposed)
		{
			throw new ObjectDisposedException(m_element.Name);
		}
	}

	internal void VerifyCoreWebView2()
	{
		if (CoreWebView2 == null)
		{
			throw new InvalidOperationException("Attempted to use WebView2 functionality which requires its CoreWebView2 prior to the CoreWebView2 being initialized.  Call EnsureCoreWebView2Async or set the Source property first.");
		}
	}

	internal void Uninitialize(bool browserCrashed = false)
	{
		_browserCrashed = browserCrashed;
		if (CoreWebView2Controller != null)
		{
			CoreWebView2Controller controller = CoreWebView2Controller;
			CoreWebView2Controller = null;
			m_element.IsVisibleChanged -= UIElement_IsVisibleChanged;
			if (!_browserCrashed)
			{
				controller.CoreWebView2.ContentLoading -= CoreWebView2_ContentLoading;
				controller.CoreWebView2.HistoryChanged -= CoreWebView2_HistoryChanged;
				controller.CoreWebView2.NavigationCompleted -= CoreWebView2_NavigationCompleted;
				controller.CoreWebView2.NavigationStarting -= CoreWebView2_NavigationStarting;
				controller.CoreWebView2.ProcessFailed -= CoreWebView2_ProcessFailed;
				controller.CoreWebView2.SourceChanged -= CoreWebView2_SourceChanged;
				controller.CoreWebView2.WebMessageReceived -= CoreWebView2_WebMessageReceived;
				SafeAccessController(delegate
				{
					try
					{
						controller.CoreWebView2.Profile.Deleted -= Profile_Deleted;
					}
					catch (NotImplementedException)
					{
					}
				});
				if (!_browserHitTransparent)
				{
					controller.AcceleratorKeyPressed -= CoreWebView2Controller_AcceleratorKeyPressed;
				}
				controller.GotFocus -= CoreWebView2Controller_GotFocus;
				controller.LostFocus -= CoreWebView2Controller_LostFocus;
				controller.MoveFocusRequested -= CoreWebView2Controller_MoveFocusRequested;
				controller.ZoomFactorChanged -= CoreWebView2Controller_ZoomFactorChanged;
				controller.Close();
			}
			controller = null;
		}
		Environment = null;
	}

	private void CoreWebView2_ProcessFailed(object sender, CoreWebView2ProcessFailedEventArgs e)
	{
		if (e.ProcessFailedKind == CoreWebView2ProcessFailedKind.BrowserProcessExited)
		{
			Uninitialize(browserCrashed: true);
		}
	}

	private void VerifyBrowserNotCrashed()
	{
		if (_browserCrashed)
		{
			throw new InvalidOperationException("The WebView control is no longer valid because the browser process crashed.To work around this, please listen for the CoreWebView2.ProcessFailed event to explicitly manage the lifetime of the WebView2 control in the event of a browser failure.https://docs.microsoft.com/en-us/dotnet/api/microsoft.web.webview2.core.corewebview2.processfailed");
		}
	}

	public void BeginInit()
	{
		_implicitInitGate.BeginInit();
	}

	public void EndInit()
	{
		_implicitInitGate.EndInit();
	}

	private void SetCurrentValueFromCore(DependencyProperty property, object value)
	{
		Trace.Assert(_propertyChangingFromCore == null);
		_propertyChangingFromCore = property;
		m_element.SetCurrentValue(property, value);
		_propertyChangingFromCore = null;
	}

	private bool IsPropertyChangingFromCore(DependencyProperty property)
	{
		if (property == null)
		{
			throw new ArgumentNullException("property");
		}
		return property == _propertyChangingFromCore;
	}

	private void UIElement_IsVisibleChanged(object sender, DependencyPropertyChangedEventArgs e)
	{
		SafeAccessController(delegate
		{
			CoreWebView2Controller.IsVisible = (bool)e.NewValue;
		});
	}

	internal static bool SourcePropertyValid(object val)
	{
		Uri uri = (Uri)val;
		if (!(uri == null))
		{
			return uri.IsAbsoluteUri;
		}
		return true;
	}

	internal static void SourcePropertyChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
	{
		GetBaseFromElement(d, out var control);
		if (!control.IsPropertyChangingFromCore(SourceProperty))
		{
			Uri uri = (Uri)e.OldValue;
			Uri uri2 = (Uri)e.NewValue;
			if (uri2 == null)
			{
				throw new NotImplementedException("The Source property cannot be set to null.");
			}
			if (control.CoreWebView2 != null && (uri == null || uri.AbsoluteUri != uri2.AbsoluteUri))
			{
				control.CoreWebView2.Navigate(uri2.AbsoluteUri);
			}
			control._implicitInitGate.RunWhenOpen(delegate
			{
				control.EnsureCoreWebView2Async();
			});
		}
	}

	private void CoreWebView2_SourceChanged(object sender, CoreWebView2SourceChangedEventArgs e)
	{
		SetCurrentValueFromCore(SourceProperty, new Uri(CoreWebView2.Source));
		this.SourceChanged?.Invoke(m_element, e);
	}

	private void CoreWebView2_NavigationStarting(object sender, CoreWebView2NavigationStartingEventArgs e)
	{
		this.NavigationStarting?.Invoke(m_element, e);
	}

	private void CoreWebView2_NavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs e)
	{
		this.NavigationCompleted?.Invoke(m_element, e);
	}

	private void CoreWebView2_HistoryChanged(object sender, object e)
	{
		m_element.SetValue(CanGoBackPropertyKey, CoreWebView2.CanGoBack);
		m_element.SetValue(CanGoForwardPropertyKey, CoreWebView2.CanGoForward);
	}

	private void CoreWebView2Controller_MoveFocusRequested(object sender, CoreWebView2MoveFocusRequestedEventArgs e)
	{
		switch (e.Reason)
		{
		case CoreWebView2MoveFocusReason.Programmatic:
		case CoreWebView2MoveFocusReason.Next:
			m_element.MoveFocus(new TraversalRequest(FocusNavigationDirection.Next));
			break;
		case CoreWebView2MoveFocusReason.Previous:
			m_element.MoveFocus(new TraversalRequest(FocusNavigationDirection.Previous));
			break;
		}
		e.Handled = true;
	}

	private void CoreWebView2Controller_GotFocus(object sender, object e)
	{
		m_element.RaiseEvent(new RoutedEventArgs(UIElement.GotFocus));
	}

	private void CoreWebView2Controller_LostFocus(object sender, object e)
	{
		m_element.RaiseEvent(new RoutedEventArgs(UIElement.LostFocus));
	}

	private void CoreWebView2Controller_AcceleratorKeyPressed(object sender, CoreWebView2AcceleratorKeyPressedEventArgs e)
	{
		WebView2KeyEventArgs webView2KeyEventArgs = new WebView2KeyEventArgs(Keyboard.PrimaryDevice, PresentationSource.FromDependencyObject(m_element), System.Environment.TickCount, KeyInterop.KeyFromVirtualKey((int)e.VirtualKey))
		{
			RoutedEvent = ((e.KeyEventKind == CoreWebView2KeyEventKind.KeyDown || e.KeyEventKind == CoreWebView2KeyEventKind.SystemKeyDown) ? UIElement.PreviewKeyDown : UIElement.PreviewKeyUp)
		};
		m_element.RaiseEvent(webView2KeyEventArgs);
		e.Handled = webView2KeyEventArgs.Handled;
	}

	internal static object CoerceZoomFactorPropertyChanged(DependencyObject d, object value)
	{
		GetBaseFromElement(d, out var control);
		if (control.CoreWebView2 != null && !control.IsPropertyChangingFromCore(ZoomFactorProperty))
		{
			control.CoreWebView2Controller.ZoomFactor = (double)value;
		}
		return value;
	}

	private void CoreWebView2Controller_ZoomFactorChanged(object sender, object e)
	{
		SetCurrentValueFromCore(ZoomFactorProperty, CoreWebView2Controller.ZoomFactor);
		this.ZoomFactorChanged?.Invoke(m_element, EventArgs.Empty);
	}

	internal static void DefaultBackgroundColorPropertyChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
	{
		GetBaseFromElement(d, out var control);
		if (control.CoreWebView2Controller != null)
		{
			control.CoreWebView2Controller.DefaultBackgroundColor = (System.Drawing.Color)e.NewValue;
		}
	}

	internal static void AllowExternalDropPropertyChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
	{
		GetBaseFromElement(d, out var control);
		if (control.CoreWebView2Controller != null)
		{
			try
			{
				control.CoreWebView2Controller.AllowExternalDrop = (bool)e.NewValue;
			}
			catch (NotImplementedException)
			{
			}
		}
	}

	public void GoBack()
	{
		if (CoreWebView2 != null)
		{
			CoreWebView2.GoBack();
		}
	}

	public void GoForward()
	{
		if (CoreWebView2 != null)
		{
			CoreWebView2.GoForward();
		}
	}

	public void Reload()
	{
		VerifyCoreWebView2();
		CoreWebView2.Reload();
	}

	public void Stop()
	{
		VerifyCoreWebView2();
		CoreWebView2.Stop();
	}

	public void NavigateToString(string htmlContent)
	{
		VerifyCoreWebView2();
		CoreWebView2.NavigateToString(htmlContent);
	}

	private void CoreWebView2_ContentLoading(object sender, CoreWebView2ContentLoadingEventArgs e)
	{
		this.ContentLoading?.Invoke(m_element, e);
	}

	public async Task<string> ExecuteScriptAsync(string javaScript)
	{
		VerifyCoreWebView2();
		return await CoreWebView2.ExecuteScriptAsync(javaScript);
	}

	private void CoreWebView2_WebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
	{
		this.WebMessageReceived?.Invoke(m_element, e);
	}

	public bool Focus()
	{
		throw new NotImplementedException();
	}

	public void Dispose()
	{
		Uninitialize();
		_disposed = true;
	}
}
