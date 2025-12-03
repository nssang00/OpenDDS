using CommunityToolkit.Mvvm.Messaging;
using CommunityToolkit.Mvvm.Messaging.Messages;
using System.Diagnostics;
using System.Threading;
using System.Windows;
// WPF가 아닌 경우 (예: MAUI), using System.Windows; 대신 
// using Microsoft.Maui.Controls; 등을 사용하고 Dispatcher 사용법을 조정해야 합니다.

namespace DelayTestApp
{
    // 🔔 메시지 정의: 전송할 데이터 타입을 지정합니다.
    public class DelayTestMessage : ValueChangedMessage<string>
    {
        public DelayTestMessage(string value) : base(value) { }
    }

    /// <summary>
    /// MainWindow.xaml에 대한 상호 작용 논리
    /// </summary>
    public partial class MainWindow : Window, IRecipient<DelayTestMessage>
    {
        private int _messageCount = 0;

        public MainWindow()
        {
            // InitializeComponent(); // XAML을 사용한다면 주석 해제

            // 1. WeakReferenceMessenger에 현재 인스턴스를 수신자로 등록합니다.
            // IRecipient 인터페이스를 구현했기 때문에, 자동으로 메시지 타입을 처리합니다.
            WeakReferenceMessenger.Default.Register<DelayTestMessage>(this);

            // UI 피드백을 위한 초기화 (WPF 예시)
            this.Title = "Messenger Delay Test";
            this.Height = 200;
            this.Width = 400;

            // 테스트 시작 버튼 생성 (WPF라면 XAML에 버튼을 추가하세요)
            Button sendButton = new Button
            {
                Content = "Send Message & Block UI",
                Margin = new Thickness(10),
                Height = 30
            };
            sendButton.Click += SendButton_Click;
            
            // XAML 컨테이너에 버튼 추가 (필요한 경우)
            // StackPanel container = new StackPanel();
            // container.Children.Add(sendButton);
            // this.Content = container;
        }

        private void SendButton_Click(object sender, RoutedEventArgs e)
        {
            Debug.WriteLine($"\n--- Send 시작: {DateTime.Now:HH:mm:ss.fff} ---");

            // 2. 메시지 전송: 이 시점에서 Receive 함수가 동기적으로 호출됩니다.
            WeakReferenceMessenger.Default.Send(new DelayTestMessage("Requesting UI Block"));

            Debug.WriteLine($"--- Send 완료: {DateTime.Now:HH:mm:ss.fff} ---\n");
            
            // 예상: Send 시작 시간과 Send 완료 시간 사이의 차이가 3000ms (3초)에 가까울 것입니다.
        }

        // 3. 메시지 수신 처리부: UI 스레드를 고의로 차단하여 지연을 유발합니다.
        public void Receive(DelayTestMessage message)
        {
            // 이 코드는 WeakReferenceMessenger.Default.Send()가 호출된 스레드에서 실행됩니다.
            // 이 경우, SendButton_Click 이벤트 핸들러가 실행되는 UI 스레드입니다.

            _messageCount++;
            Debug.WriteLine($"[Rcv {_messageCount}] 수신 시작 (UI 스레드): {DateTime.Now:HH:mm:ss.fff}, Value: {message.Value}");

            // 🚨 UI 스레드를 3초 동안 고의로 차단합니다.
            // 이로 인해 WeakReferenceMessenger.Default.Send() 호출이 완료되지 않고 대기하게 됩니다.
            Thread.Sleep(3000); 

            // UI 스레드가 차단되었으므로, 이 시간 동안 버튼을 클릭하거나 창을 움직일 수 없습니다.
            
            Debug.WriteLine($"[Rcv {_messageCount}] 처리 완료 (UI 스레드): {DateTime.Now:HH:mm:ss.fff}");
        }

        // 애플리케이션 종료 시 메시저에서 등록을 해제합니다. (선택 사항)
        protected override void OnClosed(EventArgs e)
        {
            WeakReferenceMessenger.Default.Unregister<DelayTestMessage>(this);
            base.OnClosed(e);
        }
    }
}
