using CommunityToolkit.Mvvm.Messaging;
using CommunityToolkit.Mvvm.Messaging.Messages;
using System.Diagnostics;
using System.Threading;
// 🚨 'Button' 및 'Thickness' 형식을 사용하기 위한 필수 네임스페이스
using System.Windows;
using System.Windows.Controls;
// 🚨 (선택 사항) RoutedEventArgs 사용을 위해 System.Windows를 사용합니다.

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
        private TextBlock _resultTextBlock; // 결과 메시지를 표시할 TextBlock

        public MainWindow()
        {
            InitializeComponent(); // XAML에서 정의된 요소를 초기화합니다. (필수)

            // 1. WeakReferenceMessenger에 현재 인스턴스를 수신자로 등록합니다.
            WeakReferenceMessenger.Default.Register<DelayTestMessage>(this);
            
            // XAML에 정의된 TextBlock을 찾아 연결 (선택 사항: 디버그 콘솔 대신 UI에 결과 표시)
            // XAML에 TextBlock이 'ResultText' 이름으로 정의되어 있다고 가정합니다.
            // _resultTextBlock = this.FindName("ResultText") as TextBlock;
            // if (_resultTextBlock != null)
            // {
            //     _resultTextBlock.Text = "테스트 준비 완료. 버튼을 눌러주세요.";
            // }
        }

        /// <summary>
        /// 버튼 클릭 시 WeakReferenceMessenger.Default.Send()를 호출합니다.
        /// </summary>
        private void SendButton_Click(object sender, RoutedEventArgs e)
        {
            // UI에 메시지 표시 (선택 사항)
            // if (_resultTextBlock != null)
            // {
            //     _resultTextBlock.Text = "메시지 전송 중... UI가 3초간 멈춥니다.";
            // }
            
            Debug.WriteLine($"\n--- Send 시작: {DateTime.Now:HH:mm:ss.fff} ---");

            // 2. 메시지 전송: 이 시점에서 Receive 함수가 동기적으로 호출되어 UI 스레드를 차단합니다.
            WeakReferenceMessenger.Default.Send(new DelayTestMessage("Requesting UI Block"));

            Debug.WriteLine($"--- Send 완료: {DateTime.Now:HH:mm:ss.fff} ---\n");
            
            // UI에 메시지 표시 (선택 사항)
            // if (_resultTextBlock != null)
            // {
            //     _resultTextBlock.Text = $"Send 완료. 소요 시간: 약 3초. (디버그 로그 확인)";
            // }
        }

        // 3. 메시지 수신 처리부: UI 스레드를 고의로 차단하여 지연을 유발합니다.
        public void Receive(DelayTestMessage message)
        {
            // 이 메서드는 UI 스레드에서 실행됩니다.

            _messageCount++;
            Debug.WriteLine($"[Rcv {_messageCount}] 수신 시작 (UI 스레드): {DateTime.Now:HH:mm:ss.fff}, Value: {message.Value}");

            // 🚨 UI 스레드를 3초 동안 고의로 차단합니다.
            Thread.Sleep(3000); 

            Debug.WriteLine($"[Rcv {_messageCount}] 처리 완료 (UI 스레드): {DateTime.Now:HH:mm:ss.fff}");
        }

        // 애플리케이션 종료 시 메시저에서 등록을 해제합니다.
        protected override void OnClosed(EventArgs e)
        {
            WeakReferenceMessenger.Default.Unregister<DelayTestMessage>(this);
            base.OnClosed(e);
        }
    }
}
