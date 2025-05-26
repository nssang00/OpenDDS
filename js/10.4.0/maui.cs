// 1. Cross-Platform View (공통 인터페이스)
namespace MauiApp.Controls
{
    public class CustomButton : View
    {
        public static readonly BindableProperty TextProperty = 
            BindableProperty.Create(nameof(Text), typeof(string), typeof(CustomButton), string.Empty);

        public static readonly BindableProperty BackgroundColorProperty = 
            BindableProperty.Create(nameof(BackgroundColor), typeof(Color), typeof(CustomButton), Colors.Blue);

        public string Text
        {
            get => (string)GetValue(TextProperty);
            set => SetValue(TextProperty, value);
        }

        public Color BackgroundColor
        {
            get => (Color)GetValue(BackgroundColorProperty);
            set => SetValue(BackgroundColorProperty, value);
        }

        public event EventHandler Clicked;

        internal void SendClicked() => Clicked?.Invoke(this, EventArgs.Empty);
    }
}

// 2. Handler Interface 정의
namespace MauiApp.Handlers
{
    public interface ICustomButtonHandler : IViewHandler
    {
        new CustomButton VirtualView { get; }
    }
}

// 3. Platform별 Handler 구현 - Android
#if ANDROID
using AndroidX.AppCompat.Widget;
using Microsoft.Maui.Handlers;

namespace MauiApp.Platforms.Android.Handlers
{
    public class CustomButtonHandler : ViewHandler<CustomButton, AppCompatButton>, ICustomButtonHandler
    {
        public static IPropertyMapper<CustomButton, CustomButtonHandler> Mapper = 
            new PropertyMapper<CustomButton, CustomButtonHandler>(ViewHandler.ViewMapper)
            {
                [nameof(CustomButton.Text)] = MapText,
                [nameof(CustomButton.BackgroundColor)] = MapBackgroundColor,
            };

        public static CommandMapper<CustomButton, CustomButtonHandler> CommandMapper = 
            new CommandMapper<CustomButton, CustomButtonHandler>(ViewHandler.ViewCommandMapper)
            {
                // 필요한 경우 커맨드 매핑 추가
            };

        public CustomButtonHandler() : base(Mapper, CommandMapper)
        {
        }

        protected override AppCompatButton CreatePlatformView()
        {
            var button = new AppCompatButton(Context);
            button.Click += OnButtonClick;
            return button;
        }

        protected override void DisconnectHandler(AppCompatButton platformView)
        {
            platformView.Click -= OnButtonClick;
            base.DisconnectHandler(platformView);
        }

        private void OnButtonClick(object sender, EventArgs e)
        {
            VirtualView?.SendClicked();
        }

        // Mapper 메서드들
        public static void MapText(CustomButtonHandler handler, CustomButton virtualView)
        {
            handler.PlatformView?.SetText(virtualView.Text, TextView.BufferType.Normal);
        }

        public static void MapBackgroundColor(CustomButtonHandler handler, CustomButton virtualView)
        {
            if (handler.PlatformView != null)
            {
                var color = virtualView.BackgroundColor.ToPlatform();
                handler.PlatformView.SetBackgroundColor(color);
            }
        }
    }
}
#endif

// 4. Platform별 Handler 구현 - iOS
#if IOS
using UIKit;
using Microsoft.Maui.Handlers;

namespace MauiApp.Platforms.iOS.Handlers
{
    public class CustomButtonHandler : ViewHandler<CustomButton, UIButton>, ICustomButtonHandler
    {
        public static IPropertyMapper<CustomButton, CustomButtonHandler> Mapper = 
            new PropertyMapper<CustomButton, CustomButtonHandler>(ViewHandler.ViewMapper)
            {
                [nameof(CustomButton.Text)] = MapText,
                [nameof(CustomButton.BackgroundColor)] = MapBackgroundColor,
            };

        public static CommandMapper<CustomButton, CustomButtonHandler> CommandMapper = 
            new CommandMapper<CustomButton, CustomButtonHandler>(ViewHandler.ViewCommandMapper);

        public CustomButtonHandler() : base(Mapper, CommandMapper)
        {
        }

        protected override UIButton CreatePlatformView()
        {
            var button = UIButton.FromType(UIButtonType.System);
            button.TouchUpInside += OnButtonClick;
            return button;
        }

        protected override void DisconnectHandler(UIButton platformView)
        {
            platformView.TouchUpInside -= OnButtonClick;
            base.DisconnectHandler(platformView);
        }

        private void OnButtonClick(object sender, EventArgs e)
        {
            VirtualView?.SendClicked();
        }

        // Mapper 메서드들
        public static void MapText(CustomButtonHandler handler, CustomButton virtualView)
        {
            handler.PlatformView?.SetTitle(virtualView.Text, UIControlState.Normal);
        }

        public static void MapBackgroundColor(CustomButtonHandler handler, CustomButton virtualView)
        {
            if (handler.PlatformView != null)
            {
                handler.PlatformView.BackgroundColor = virtualView.BackgroundColor.ToPlatform();
            }
        }
    }
}
#endif

// 5. Handler 등록 (MauiProgram.cs)
public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
            })
            .ConfigureMauiHandlers(handlers =>
            {
#if ANDROID
                handlers.AddHandler<CustomButton, MauiApp.Platforms.Android.Handlers.CustomButtonHandler>();
#elif IOS
                handlers.AddHandler<CustomButton, MauiApp.Platforms.iOS.Handlers.CustomButtonHandler>();
#endif
            });

        return builder.Build();
    }
}

// 6. 사용 예제 (XAML)
/*
<ContentPage xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
             xmlns:controls="clr-namespace:MauiApp.Controls"
             x:Class="MauiApp.MainPage">
    <StackLayout>
        <controls:CustomButton x:Name="MyButton"
                               Text="Click Me!"
                               BackgroundColor="Red"
                               Clicked="OnCustomButtonClicked" />
    </StackLayout>
</ContentPage>
*/

// 7. 코드비하인드에서 사용
public partial class MainPage : ContentPage
{
    public MainPage()
    {
        InitializeComponent();
    }

    private void OnCustomButtonClicked(object sender, EventArgs e)
    {
        DisplayAlert("Alert", "Custom button clicked!", "OK");
    }
}

// 8. 고급 Mapper 사용 - 기존 Handler 확장
public static class ButtonHandlerExtensions
{
    public static void AddCustomMappings()
    {
        // 기존 Button Handler에 추가 매핑
        Microsoft.Maui.Handlers.ButtonHandler.Mapper.AppendToMapping("CustomProperty", (handler, view) =>
        {
            // 커스텀 로직 추가
#if ANDROID
            if (handler.PlatformView is AndroidX.AppCompat.Widget.AppCompatButton androidButton)
            {
                // Android 특정 로직
            }
#elif IOS
            if (handler.PlatformView is UIKit.UIButton iosButton)
            {
                // iOS 특정 로직
            }
#endif
        });
    }
}

// 9. 조건부 Mapper 예제
public class ConditionalMapperExample
{
    public static void SetupConditionalMapping()
    {
        CustomButtonHandler.Mapper.AppendToMapping("ConditionalStyle", (handler, view) =>
        {
            if (view is CustomButton customButton && customButton.Text?.Contains("Important") == true)
            {
#if ANDROID
                handler.PlatformView?.SetTextColor(Android.Graphics.Color.Red);
#elif IOS
                handler.PlatformView?.SetTitleColor(UIKit.UIColor.Red, UIKit.UIControlState.Normal);
#endif
            }
        });
    }
}
